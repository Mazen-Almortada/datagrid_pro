import frappe
import json
from frappe.utils import cstr
from frappe.query_builder import Order, Criterion
from frappe.query_builder.functions import Count, Coalesce, GroupConcat
from pypika import Field

def build_qb_criterion_from_dx_filters(dx_filters, doctype, valid_grid_columns):
    DocTypeTableQB = frappe.qb.DocType(doctype)

    def map_operator_and_value(field_name, dx_operator, value):
        if not (field_name in valid_grid_columns):
            return None 

        field_term = getattr(DocTypeTableQB, field_name)
        op = cstr(dx_operator).lower()
                
        if op == "=":
            if value is None or value == '': return field_term.isnull() | (field_term == '')
            return field_term == value
            
        if op == "<>":
            if value is None or value == '': return field_term.isnotnull() & (field_term != '')
            return field_term != value
        
        if op == "isblank": return field_term.isnull() | (field_term == '')
        if op == "isnotblank": return field_term.isnotnull() & (field_term != '')

        if op == "contains": return field_term.like(f"%{value}%")
        if op == "notcontains": return field_term.notlike(f"%{value}%")
        if op == "startswith": return field_term.like(f"{value}%")
        if op == "endswith": return field_term.like(f"%{value}")
        if op == ">": return field_term > value
        if op == "<": return field_term < value
        if op == ">=": return field_term >= value
        if op == "<=": return field_term <= value
        if op == "in": return field_term.isin(value if isinstance(value, list) else [value])
        if op == "notin": return field_term.notin(value if isinstance(value, list) else [value])
        
        return None

    def parse_element(element):
        if not element: return None
        if isinstance(element, list) and len(element) == 3 and isinstance(element[0], str) and isinstance(element[1], str):
            return map_operator_and_value(element[0], element[1], element[2])
        if isinstance(element, list) and len(element) == 2 and element[0] == "!" and isinstance(element[1], list):
            sub_criterion = parse_element(element[1])
            return sub_criterion.negate() if sub_criterion else None
        if isinstance(element, list):
            criteria_parts, logical_ops = [], []
            for item in element:
                if isinstance(item, list):
                    parsed_item = parse_element(item)
                    if parsed_item: criteria_parts.append(parsed_item)
                elif isinstance(item, str) and item.lower() in ["and", "or"]:
                    logical_ops.append(item.lower())
            if not criteria_parts: return None
            if logical_ops and len(logical_ops) == len(criteria_parts) - 1:
                current_criterion = criteria_parts[0]
                for i, op_str in enumerate(logical_ops):
                    if op_str == "and": current_criterion = current_criterion & criteria_parts[i+1]
                    elif op_str == "or": current_criterion = current_criterion | criteria_parts[i+1]
                return current_criterion
            elif criteria_parts:
                return Criterion.all(criteria_parts)
        return None
    return parse_element(dx_filters)

def build_qb_criterion_from_frappe_filters(frappe_filters, doctype):
    if not frappe_filters:
        return None
    DocTypeTableQB = frappe.qb.DocType(doctype)
    criteria = []
    for f in frappe_filters:
        if len(f) != 4: continue
        filter_doctype, fieldname, operator, value = f[0], f[1], f[2], f[3]
        op = operator.lower()
        if fieldname == "_user_tags":
            TagLinkQB = frappe.qb.DocType("Tag Link")
            
            if op in ("like", "not like"):
                sub_query = (frappe.qb.from_(TagLinkQB)
                    .select(TagLinkQB.document_name)
                    .where((TagLinkQB.document_type == doctype) & (TagLinkQB.tag.like(value)))
                )
                if op == "like":
                    criteria.append(DocTypeTableQB.name.isin(sub_query))
                else: 
                    criteria.append(DocTypeTableQB.name.notin(sub_query))

            elif op == "is" and value.lower() in ("set", "not set"):
                sub_query = (frappe.qb.from_(TagLinkQB)
                    .select(TagLinkQB.document_name)
                    .where(TagLinkQB.document_type == doctype)
                    .distinct()
                )
                if value.lower() == "set":
                    criteria.append(DocTypeTableQB.name.isin(sub_query))
                else:
                    criteria.append(DocTypeTableQB.name.notin(sub_query))
            
            continue


        field_term = getattr(DocTypeTableQB, fieldname)
        if op == "=": criteria.append(field_term == value)
        elif op == "!=": criteria.append(field_term != value)
        elif op == "like": criteria.append(field_term.like(value))
        elif op == "not like": criteria.append(field_term.notlike(value))
        elif op == "in": criteria.append(field_term.isin(value))
        elif op == "not in": criteria.append(field_term.notin(value))
        elif op == ">": criteria.append(field_term > value)
        elif op == "<": criteria.append(field_term < value)
        elif op == ">=": criteria.append(field_term >= value)
        elif op == "<=": criteria.append(field_term <= value)
        elif op == "is" and value.lower() == "set": criteria.append(field_term.isnotnull() & (field_term != ''))
        elif op == "is" and value.lower() == "not set": criteria.append(field_term.isnull() | (field_term == ''))
        elif op in ("descendants of (inclusive)", "descendants of", "not descendants of", "ancestors of", "not ancestors of"):
            try:
                linked_doctype = frappe.get_meta(doctype).get_field(fieldname).options
                node = frappe.db.get_value(linked_doctype, value, ["lft", "rgt"], as_dict=True)
                if not node:
                    criteria.append(field_term.isnull() & field_term.isnotnull())
                    continue

                if op in ("descendants of (inclusive)", "descendants of"):
                    desc_names = frappe.db.get_all(linked_doctype, filters={"lft": [">=" if op == "descendants of (inclusive)" else ">", node.lft], "rgt": ["<=" if op == "descendants of (inclusive)" else "<", node.rgt]}, pluck="name")
                    if desc_names: criteria.append(field_term.isin(desc_names))
            except Exception as e:
                frappe.log_error(f"Failed to process tree filter for {fieldname}: {e}", "DevExtreme Filter")
                criteria.append(field_term.isnull() & field_term.isnotnull())
    
    return Criterion.all(criteria) if criteria else None


@frappe.whitelist()
def get_devextreme_list_data(doctype, load_options_json, frappe_filters_json=None):
    if not frappe.has_permission(doctype, "read"):
        frappe.throw(frappe._("Not permitted to read {0}").format(doctype), frappe.PermissionError)

    try:
        load_options = json.loads(load_options_json)
        frappe_filters = json.loads(frappe_filters_json) if frappe_filters_json else None
    except json.JSONDecodeError:
        frappe.throw("Invalid JSON format in request", title="API Error")
    
    skip = load_options.get("skip", 0)
    take = load_options.get("take", 20)
    sort_options = load_options.get("sort")
    dx_filter_options = load_options.get("filter")
    group_options = load_options.get("group")
    
    fields_to_fetch = load_options.get("select", [])
    if "name" not in fields_to_fetch:
        fields_to_fetch.append("name")
    fields_to_fetch = list(set(fields_to_fetch))
    
    valid_grid_columns = set(fields_to_fetch)
    if "_user_tags" in valid_grid_columns:
        valid_grid_columns.remove("_user_tags")
        
    DocTypeTableQB = frappe.qb.DocType(doctype)
    standard_system_fields_for_check = ["name", "owner", "creation", "modified", "modified_by", "docstatus", "idx"]

    dx_criterion = build_qb_criterion_from_dx_filters(dx_filter_options, doctype, valid_grid_columns)
    frappe_criterion = build_qb_criterion_from_frappe_filters(frappe_filters, doctype)
    final_criterion = Criterion.all([c for c in [dx_criterion, frappe_criterion] if c is not None])

    response = {}

    if group_options and isinstance(group_options, list) and len(group_options) > 0:
        group_field_info = group_options[0]
        group_selector = cstr(group_field_info.get("selector")).strip()
        
        if not group_selector or not (frappe.get_meta(doctype).has_field(group_selector) or group_selector in standard_system_fields_for_check):
             frappe.throw(f"Invalid group selector: '{group_selector}'.")

        group_field_term = Field(group_selector)
        group_field_coalesced = Coalesce(group_field_term, '').as_('key')
        group_query = (frappe.qb.from_(DocTypeTableQB)
                       .select(group_field_coalesced, Count("*").as_("count"))
                       .groupby(Coalesce(group_field_term, '')))
        
        if final_criterion: group_query = group_query.where(final_criterion)
        if load_options.get("requireGroupCount"):
            response["groupCount"] = frappe.qb.from_(group_query.as_("sub")).select(Count("*")).run(as_list=True)[0][0] or 0
        
        group_sort_order = Order.desc if group_field_info.get("desc", False) else Order.asc
        group_query = group_query.orderby(Coalesce(group_field_term, ''), order=group_sort_order)
        
        if take > 0: group_query = group_query.limit(take).offset(skip)
        
        grouped_data = group_query.run(as_dict=True)
        for g in grouped_data: g["items"] = None
        response["data"] = grouped_data

        count_query = frappe.qb.from_(DocTypeTableQB).select(Count("*"))
        if final_criterion: count_query = count_query.where(final_criterion)
        response["totalCount"] = count_query.run(as_list=True)[0][0] or 0
    else: 
        count_query = frappe.qb.from_(DocTypeTableQB).select(Count("*"))
        if final_criterion: count_query = count_query.where(final_criterion)
        response["totalCount"] = count_query.run(as_list=True)[0][0] or 0

        CommentQB = frappe.qb.DocType("Comment")
        TagLinkQB = frappe.qb.DocType("Tag Link")

        user_tags_subquery = (
            frappe.qb.from_(TagLinkQB)
            .select(GroupConcat(TagLinkQB.tag))
            .where(
                (TagLinkQB.document_type == doctype) &
                (TagLinkQB.document_name == DocTypeTableQB.name)
            )
        ).as_("_user_tags")
        
        comment_count_subquery = (
            frappe.qb.from_(CommentQB)
            .select(Count(CommentQB.name))
            .where((CommentQB.reference_doctype == doctype) & (CommentQB.reference_name == DocTypeTableQB.name) & (CommentQB.comment_type == "Comment"))
        ).as_("comment_count")
        
        if 'comment_count' in fields_to_fetch: fields_to_fetch.remove('comment_count')
        if '_user_tags' in fields_to_fetch: fields_to_fetch.remove('_user_tags')

        fields_for_select_statement = [getattr(DocTypeTableQB, f) for f in fields_to_fetch]
        fields_for_select_statement.append(comment_count_subquery)
        fields_for_select_statement.append(user_tags_subquery)

        qb_query = frappe.qb.from_(DocTypeTableQB).select(*fields_for_select_statement)
        
        if final_criterion: qb_query = qb_query.where(final_criterion)
        
        qb_orderby_tuples = []
        if sort_options and isinstance(sort_options, list):
            for sort_item in sort_options:
                if isinstance(sort_item, dict) and "selector" in sort_item:
                    field_selector = cstr(sort_item["selector"]).strip()
                    if field_selector in ["comment_count", "_user_tags"] or frappe.get_meta(doctype).has_field(field_selector) or field_selector in standard_system_fields_for_check:
                        field_term = Field(field_selector) if field_selector in ["comment_count", "_user_tags"] else getattr(DocTypeTableQB, field_selector)
                        direction = Order.desc if sort_item.get("desc") else Order.asc
                        qb_orderby_tuples.append((field_term, direction))
        
        if not qb_orderby_tuples: 
            meta = frappe.get_meta(doctype)
            default_sort_field = meta.sort_field or 'modified'
            if frappe.get_meta(doctype).has_field(default_sort_field) or default_sort_field in standard_system_fields_for_check:
                field_term = getattr(DocTypeTableQB, default_sort_field)
                direction = Order.desc if (meta.sort_order or 'desc').lower() == 'desc' else Order.asc
                qb_orderby_tuples.append((field_term, direction))
        
        for field_t, sort_o_enum in qb_orderby_tuples:
            qb_query = qb_query.orderby(field_t, order=sort_o_enum)
        
        if take > 0:
            qb_query = qb_query.limit(take).offset(skip)
        
        response["data"] = qb_query.run(as_dict=True)
    
    return response
