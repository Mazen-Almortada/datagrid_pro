frappe.views.ListView = class DevExtremeListView extends frappe.views.ListView {
    setup_defaults() {
        super.setup_defaults();
        this.selected_items = [];
        this.auto_refresh = false; 
        this.tags_shown =false;
        this.gridInstance = null; 
        this.grid_wrapper_class = `devextreme-list-view-wrapper-${this.doctype.replace(/\s+/g, '_')}`;
        return this.get_list_view_settings();

    }
    toggle_tags() {
		this.tags_shown = !this.tags_shown;
		const preview_label = this.tags_shown ? __("Hide Tags") : __("Show Tags");
		this.list_sidebar.parent.find(".list-tag-preview").text(preview_label);
        if (this.gridInstance) {
            this.gridInstance.columnOption("_user_tags", "visible", this.tags_shown);
        }
	}
    refresh(force =false) {

        if (force) {
            if (this.gridInstance) {
                this.gridInstance = null;
            } 
            this.render();
        } else{
            if (this.gridInstance) {
                this.gridInstance.refresh();
                } 
                else{
                    this.render();
                }
        }
    }
    
    setup_realtime_updates() {
        frappe.realtime.on(`doc_update_for_${this.doctype}`, (data) => {
            if (this.gridInstance) {
                this.gridInstance.refresh();

                if (data.doctype && data.name && this.gridInstance.getRowIndexByKey(data.name) !== -1) {
                }
            }
        });
    }

    setup_view() {

        if (this.page && this.page.main) {
            this.page.main.find(".frappe-list").empty();
            this.page.main.find(".filter-section.flex").find(".sort-selector").remove();
        }
    }

    get_checked_items(only_docnames) {
        const docnames = this.selected_items || [];
        if (only_docnames) {
            return docnames;
        }
        const grid_data = this.gridInstance ? this.gridInstance.getDataSource().items() : this.data || [];
        return grid_data.filter((d) => docnames.includes(d.name));
    }

    render() {
        if (this.$result) {
            this.$result.hide();
        }
  
        if (this.page && this.page.main && !this.gridInstance) {
            this.render_devextreme_grid();
        }
    }

    async render_devextreme_grid() {
        const doctype = this.doctype;
        const me = this;

        this.page.main.find(`.${this.grid_wrapper_class}`).remove();
        const grid_div = $(`<div class="${this.grid_wrapper_class}" style="margin: 8px;"></div>`);
        this.page.main.append(grid_div);

        this.page.main.find(`#externalSearchBox_${doctype.replace(/\s+/g, '_')}`).remove();
        if (this.list_view_settings?.show_search_box) {
            
            const $searchBox = $(`<div id="externalSearchBox_${doctype.replace(/\s+/g, '_')}" style="width: 100%; margin-bottom: 8px;"></div>`);
            this.page.main.find(".page-form.flex").prepend($searchBox);
        }
try {
    
    await this.setup_columns();
} catch (error) {
console.log(error);

    
    this.refresh();
}
        const meta = frappe.get_meta(doctype);
                const dx_columns = [];
        const fields_for_select_option = new Set(["name"]);
        this.columns.forEach(col_info => {
            if (col_info.df) {
                const df = col_info.df;
                fields_for_select_option.add(df.fieldname);

                let column_definition = {
                    dataField: df.fieldname,
                    caption: __(df.label || frappe.model.unscrub(df.fieldname)),
                    dataType: map_frappe_field_type_to_dx(df.fieldtype),
                    allowGrouping: !["modified", "email", "description", "_liked_by", "comment_count","_assign", "image", "subject", "name", meta.title_field].includes(df.fieldname),
                    allowHeaderFiltering: !["name"].includes(df.fieldname) && df.fieldtype !=="Check" && !(df.fieldtype === "Select" && df.options),
                    allowSorting: true,
                    autoExpandGroup:false,
                    headerFilter: { search: { 
                        editorOptions: {
                            placeholder: __("Search..."),
                        },
                        enabled: true } ,
                    texts: {
                        cancel:__("Cancel"),
                        ok:__("OK")
                        },
                }
                };
                if (df.fieldtype === 'Check') {
                    column_definition.trueText = __("Yes");
                    column_definition.falseText = __("No");
                    column_definition.groupCellTemplate = function(cellElement, cellInfo) {
                        const display_text = cellInfo.value ? __("Yes") : __("No");
                        cellElement.text(`${cellInfo.column.caption}: ${display_text}`);
                    };
                    
                }
                  if (df.fieldtype === "Select" && df.options) {
                    const selectOptions = (typeof df.options === 'string' ? df.options.split('\n') : df.options || [])
                        .filter(opt => opt.trim() !== "")
                        .map(opt => ({ value: opt, display_value: __(opt) }));
                    column_definition.lookup = {
                        dataSource: selectOptions,
                        valueExpr: "value", 
                        displayExpr: "display_value"
                    };
                }
                dx_columns.push(column_definition);
            }
        });
        const tagsColumn = {
            dataField: "_user_tags",
            caption: __("Tags"),
            visible: this.tags_shown,
            allowFiltering: false,
            allowSorting: false,
            allowGrouping: false,
            allowResizing: true,
            // width: 150, 
            cellTemplate: function(container, options) {
                if (options.value) {
                    const tags = options.value;
                    const $tagsContainer = $('<div class="list-row-col tag-col  hidden-xs ellipsis"></div>');
                    const tagsHtml =   me. get_tags_html(tags,2,true);

                    $tagsContainer.append(tagsHtml);
                    container.append($tagsContainer);
                }
            }
        };
        dx_columns.splice(1, 0, tagsColumn);
        const special_column_definitions = [

        
            { 
                dataField: "modified", caption: __("Last Updated"), dataType: "datetime", 
                allowGrouping: false, allowSorting: true, sortOrder: "desc", 
                alignment:"center",
                width:120,
                allowHeaderFiltering: false,
                headerFilter: { search: { enabled: true } },
                cellTemplate: (cellElement, cellInfo) => { if (cellInfo.value) { $(cellElement).html(`<span style="font-size:12px;">${frappe.datetime.comment_when(cellInfo.value,true)}</span>`); }}, 
                format: 'shortDateShortTime'
            },
        
            { 
                dataField: "_assign", 
                caption: "",
                allowFiltering: false, 
                allowSorting: false,
                allowGrouping: false,
                allowResizing: false,
                alignment:"center",
                width: 30,
                allowHeaderFiltering: false,
                cellTemplate: (cellElement, cellInfo) => {
                    let assigned_users = cellInfo.value ? JSON.parse(cellInfo.value) : [];
                    if (assigned_users.length) {
                        const $assign_icon = $(`
                            <div class="assign-indicator" style="cursor: pointer; display: flex; align-items: center; justify-content: center; height: 100%;">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-muted">
                                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                    <circle cx="9" cy="7" r="4"></circle>
                                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                                </svg>
                            </div>
                        `);
    
                        let hide_timeout;
                        $assign_icon.popover({
                            trigger: "manual",
                            placement: 'top',
                            html: true,
                            template: '<div class="popover assignee-popover" role="tooltip"><div class="arrow"></div><div class="popover-body"></div></div>',
                            sanitize: false,
                            content: function() {
                                let content_html = '<h6>'+__('Assigned To')+'</h6><hr class="my-1">';
                                assigned_users.forEach(user => {
                                    const user_info = frappe.user_info[user];
                                    const fullname = user_info ? user_info.fullname : user;
                                    content_html += `
                                        <div class="assignee-popover-item" data-user="${user}">
                                            ${frappe.avatar(user, 'avatar-small')}
                                            <span>${fullname}</span>
                                        </div>
                                    `;
                                });
                                return content_html;
                            },
                            container: "body"
                        });
    
                        const show_popover = () => {
                            clearTimeout(hide_timeout);
                            $assign_icon.popover('show');
                            const popover_id = $assign_icon.attr('aria-describedby');
                            if (popover_id) {
                                 const $popover = $('#' + popover_id);
                                 $popover.off('mouseleave').on('mouseleave', hide_popover);
                                 $popover.off('mouseenter').on('mouseenter', () => clearTimeout(hide_timeout));
    
                                 $popover.find('.assignee-popover-item').on('click', function() {
                                     const user_to_filter = $(this).attr('data-user');
                                     if (user_to_filter) {
                                         me.filter_area.add(me.doctype, '_assign', 'like', `%${user_to_filter}%`);
                                     }
                                     $assign_icon.popover('hide');
                                 });
                            }
                        };
    
                        const hide_popover = () => {
                            hide_timeout = setTimeout(() => {
                                $assign_icon.popover('hide');
                            }, 200);
                        };
    
                        $assign_icon.on('mouseenter', show_popover);
                        $assign_icon.on('mouseleave', hide_popover);
                        
                        
                        $(cellElement).html($assign_icon); 
                        cellElement.css('padding','0px');
                    }
                }, 
            },
...(!this.list_view_settings?.disable_comment_count?[{
    dataField: "comment_count",
    caption: "",
    dataType: "number",
    allowFiltering: false, 
    allowSorting: false,
    allowGrouping: false,
    allowResizing: false,
    width: 50,
    alignment: 'center',

    cellTemplate: (cellElement, cellInfo) => {
        const comments_count = cellInfo.value;
  

        const $comments_count_icon = $(`
            <span class="comment-count" style="
    font-size: x-small;"  title="${comments_count}">
				<svg class="es-icon es-line  icon-sm" style="" aria-hidden="true">
			<use class="" href="#es-line-chat-alt"></use>
		</svg>
				${comments_count}
			</span>
        `);

        cellElement.append($comments_count_icon);
        cellElement.css('padding-right','0px');
        
    },
 
    headerCellTemplate: (header, info) => {
       

        const $icon = $(` <svg class="es-icon es-line  icon-sm" style="" aria-hidden="true" title="${__('Comments')}">
            <use class="" href="#es-line-chat-alt"></use>
            </svg>`);

        header.html($icon);

       
    }

}]:[])
           ,
            {
                dataField: "_liked_by",
                caption: "",
                dataType: "string",
                allowFiltering: false, 
                allowSorting: false,
                allowGrouping: false,
                allowResizing: false,
                width: 50,
                alignment: 'center',

cellTemplate: (cellElement, cellInfo) => {
    const liked_by_users = JSON.parse(cellInfo.value || "[]");
    const is_liked = liked_by_users.includes(frappe.session.user);
    const like_class = is_liked ? "liked" : "not-liked";
    const icon_class = is_liked ? "fa fa-heart text-danger" : "fa fa-heart-o text-muted";
    const title = is_liked ? __("Unlike") : __("Like");

    const $like_btn = $(`
        <span class="like-action list-row-like ${like_class}" title="${title}">
            <i class="${icon_class}"></i>
        </span>
    `);

    $like_btn.on('click', function(e) {
        e.stopPropagation();
        const $clicked_btn = $(this);
        const $icon = $clicked_btn.find('i');

        frappe.ui.toggle_like($clicked_btn, doctype, cellInfo.data.name, () => {
            if ($clicked_btn.hasClass('liked')) {
                $icon.removeClass('fa-heart-o text-muted').addClass('fa fa-heart text-danger');
                $clicked_btn.attr('title', __('Unlike'));
            } else {
                $icon.removeClass('fa-heart text-danger').addClass('fa-heart-o text-muted');
                $clicked_btn.attr('title', __('Like'));
            }
        });
    });

    cellElement.append($like_btn);
},
       
                headerCellTemplate: (header, info) => {
                    const is_currently_filtered = me.get_filters_for_args().some(f => f[1] === '_liked_by');
					const icon_class = is_currently_filtered ? 'fa fa-heart text-danger' : 'fa fa-heart text-muted';
					const $icon = $(`<i class="${icon_class}" title="${__('Liked by me')}"></i>`);

					header.html($icon).css('cursor', 'pointer');

					header.off('click').on('click', () => {
						const $clicked_icon = header.find('i');
						const is_active = $clicked_icon.hasClass('text-danger');

						if (is_active) {
							$clicked_icon.removeClass('text-danger').addClass('text-muted');
							me.filter_area.remove("_liked_by");
						} else {
							$clicked_icon.removeClass('text-muted').addClass('text-danger');
							me.filter_area.add(
								me.doctype,
								"_liked_by",
								"like",
								`%${frappe.session.user}%`
							);
						}
					});
                }
            },
        ];

        const status_fieldname = meta.fields.find(f => ["status", "workflow_state", "docstatus", "disabled", "enabled"].includes(f.fieldname))?.fieldname;
        if(status_fieldname){
             fields_for_select_option.add(status_fieldname);
             const df_status = meta.fields.find(f => f.fieldname === status_fieldname);

            let status_header_filter_options = [];
            let column_data_type = "string";

            if (status_fieldname === 'docstatus') {
                column_data_type = "number"; 
                status_header_filter_options = [
                    { text: __("Draft"), value: 0 },
                    { text: __("Submitted"), value: 1 },
                    { text: __("Cancelled"), value: 2 }
                ];
            } else if (df_status?.options) {
                status_header_filter_options = (typeof df_status.options === 'string' ? df_status.options.split('\n') : df_status.options)
                    .filter(opt => opt.trim() !== "")
                    .map(opt => ({ text: __(opt), value: opt }));
            }else if (status_fieldname === "disabled") {
                column_data_type = "number";
                status_header_filter_options = [
                    { text: __("Disabled"), value: 1 },
                    { text: __("Enabled"), value: 0 },
                    
                ];
            
            }else if (status_fieldname === "enabled") {
                column_data_type = "number";
                status_header_filter_options = [
                    { text: __("Enabled"), value: 1 },
                    { text: __("Disabled"), value: 0 },
                    
                ];
            } 
             special_column_definitions.unshift({ 
                dataField: status_fieldname, 
                caption: __("Status"),
                allowFiltering:false,
                alignment: frappe.boot.lang === "ar"?"right":"left",
                dataType: column_data_type, allowGrouping: true, allowSorting: true, allowHeaderFiltering: true,
                headerFilter: { 
                    dataSource: status_header_filter_options.length > 0 ? status_header_filter_options : null,
                    search: { enabled: true }},
                cellTemplate: (cellElement, cellInfo) => { 
                    const indicator = frappe.get_indicator(cellInfo.data, doctype);
                     if (indicator) { 
                        $(cellElement).html(`<span class="indicator-pill whitespace-nowrap ${indicator[1]}">${__(indicator[0])}</span>`); 
                    } else { $(cellElement).text(__(cellInfo.value) || ''); }},

                groupCellTemplate: function(cellElement, cellInfo) {
                        const option = status_header_filter_options.find(opt => opt.value === cellInfo.value);
                        const display_text = option ? option.text : cellInfo.value;
                        cellElement.text(`${cellInfo.column.caption}: ${display_text}`);
                    }
            });
        }
        
        special_column_definitions.forEach(special_col_def => {
            fields_for_select_option.add(special_col_def.dataField);
            let existing_col_index = dx_columns.findIndex(c => c.dataField === special_col_def.dataField);
            if (existing_col_index === -1) {
                 dx_columns.push(special_col_def);
            } else {
                dx_columns[existing_col_index] = { ...dx_columns[existing_col_index], ...special_col_def };
            }
        });
        
        let primaryLinkColumnDataField = meta.title_field || "name";
        if (!dx_columns.find(c => c.dataField === primaryLinkColumnDataField) && primaryLinkColumnDataField !== 'name') {
            if (meta.fields.find(f => f.fieldname === primaryLinkColumnDataField)){
                 fields_for_select_option.add(primaryLinkColumnDataField);
            } else {
                primaryLinkColumnDataField = "name";
            }
        }
        fields_for_select_option.add(primaryLinkColumnDataField);
        fields_for_select_option.add("_assign");

        let primaryLinkColumn = dx_columns.find(c => c.dataField === primaryLinkColumnDataField);
        const primaryLinkDocField = meta.fields.find(f => f.fieldname === primaryLinkColumnDataField);
        const primaryLinkCaption = __(primaryLinkDocField?.label || (primaryLinkColumnDataField === "name" ? (meta.name_case || "Name") : frappe.model.unscrub(primaryLinkColumnDataField)));

        if (!primaryLinkColumn) {
            primaryLinkColumn = {
                dataField: primaryLinkColumnDataField,
                caption: primaryLinkCaption,
                allowGrouping: false, allowSorting: true, allowHeaderFiltering: true,
                headerFilter: { search: { enabled: true }},
            };
            const likeColIndex = dx_columns.findIndex(c => c.dataField === "_liked_by");
            dx_columns.splice(likeColIndex + 1, 0, primaryLinkColumn);
        } else {
            primaryLinkColumn.caption = primaryLinkCaption;
            primaryLinkColumn.allowGrouping = false;
        }
        // primaryLinkColumn.width = 200;
        primaryLinkColumn.cellTemplate = (cellElement, cellInfo) => {
            const docname = cellInfo.data.name; 
            const display_text = cellInfo.data[primaryLinkColumn.dataField] || docname;
            if (docname) { $(cellElement).html(frappe.utils.get_form_link(doctype, docname, true, __(display_text))); }
            else { $(cellElement).text(__(display_text)); }
        };
        
        const final_select_fields = Array.from(fields_for_select_option);

        const customDataSource = new DevExpress.data.CustomStore({
            key: "name", 
            loadMode: "processed",

            load: function(loadOptions) {
                const deferred = $.Deferred();
                const frappe_filters = me.get_filters_for_args().map(f => {
                    return [f[0], f[1], f[2], f[3]]; 
                });

                loadOptions.select = final_select_fields;
                const $loader = me.page.main.find(`.${me.grid_wrapper_class} .dot-loader`);
                $loader.addClass('show');
                
                frappe.call({
                    method: "datagrid_pro.api.get_devextreme_list_data", 
                    args: {
                        doctype: doctype,
                        load_options_json: JSON.stringify(loadOptions),
                        frappe_filters_json: JSON.stringify(frappe_filters) 
                    },
                    callback: (r) => { 
                        setTimeout(() => { $loader.removeClass('show'); }, 300);


                        if (r.message && r.message.data !== undefined) { 
                            me.data = r.message.data; 
                            deferred.resolve(r.message); 
                        } else { 
                            deferred.reject("Invalid API response"); 
                        }},
                    error: (err) => {
                        setTimeout(() => { $loader.removeClass('show'); }, 300);

                        deferred.reject("API call failed");
                    }
                });
                return deferred.promise();
            },
        });
        let fromMobile =false;
        if (window.innerWidth <= 768) {
            fromMobile = true;

        } else {
fromMobile =false; 
}
        let isCountEnabled = this.list_view_settings?.disable_count === 0;

        this.gridInstance = $(grid_div).dxDataGrid({
            dataSource: customDataSource,
            autoNavigateToFocusedRow:false,
            remoteOperations: {
                filtering: true,
                sorting: true,
                paging: true,
                grouping: true,
                summary: true, 
                groupPaging: true
            }, 
      
            columns: dx_columns,
            height: 600,
            allowColumnReordering: true, allowColumnResizing: true, columnAutoWidth: fromMobile?true: false, columnResizingMode: "nextColumn",
            showBorders: true, rowAlternationEnabled: true, hoverStateEnabled: true, wordWrapEnabled: true,
            filterRow: {
                applyFilter: "auto",
                applyFilterText: __("Apply filter"),
                betweenEndText: __("End"),
                betweenStartText: __("Start"),
                operationDescriptions: {
                  between: __("Between"),
                  contains: __("Contains"),
                  endsWith: __("Ends with"),
                  equal: __("Equals"),
                  greaterThan: __("Greater than"),
                  greaterThanOrEqual: __("Greater than or equal to"),
                  lessThan: __("Less than"),
                  lessThanOrEqual: __("Less than or equal to"),
                  notContains: __("Does not contain"),
                  notEqual: __("Does not equal"),
                  startsWith: __("Starts with")
                },
                resetOperationText: __("Reset"),
                showAllText: __("(ALL)"),
                showOperationChooser: true,
                visible: true
              },
            headerFilter: { visible: true, search: { enabled: true } },
            searchPanel: { visible: false},
            groupPanel: { visible: true, emptyPanelText: __("Drag a column header here to group by that column") },
            showScrollbar:"never",
            rtlEnabled: frappe.boot.lang === "ar"? true:false,
            grouping: { 
                autoExpandAll: false, 
                contextMenuEnabled: true 
            }, 
            scrolling: { mode: "standard" },
            paging: { pageSize: 20 },
            pager: { visible: true,
                 showPageSizeSelector: true, 
                 infoText: __("Page {0} of {1} ({2} items)"),
                 allowedPageSizes: [20, 50, 100, 500], showInfo: isCountEnabled, showNavigationButtons: true },
            selection: { mode: "multiple", deferred: false, showCheckBoxesMode: "always", selectAllMode: "page" },
            onSelectionChanged: (e) => { 
                me.selected_items = e.selectedRowKeys; 
                me.toggle_actions_menu_button(me.selected_items.length > 0); 
            },
            onCellPrepared: function(e) {
                if (e.rowType === "data") {
                    e.cellElement.css({
                        'white-space': 'nowrap',
                        'overflow': 'hidden',
                        'text-overflow': 'ellipsis',
                        'word-break': 'keep-all',      
                        'word-wrap': 'normal'         
                      
                    });
                }
            }
,            
onContentReady: function(e) {
    
    const $headerPanel = e.element.find(`.dx-datagrid-header-panel`);
    
    
    if ($headerPanel.find('.dot-loader').length === 0) {
        const loader_html = `<div class="dot-loader"><span></span><span></span><span></span><span></span><span></span></div>`; 
        $headerPanel.css('position', 'relative');
        $headerPanel.append(loader_html);
    }
},
            onRowClick: (e) => {
                if (e.event.target.closest('.dx-checkbox') || e.event.target.closest('.like-action')) return;
                if (e.rowType === "data" && e.data?.name) frappe.set_route('Form', doctype, e.data.name);
            },
            export: { enabled: true, fileName: `${doctype}_List_Export`, allowExportSelectedData: true },
            onExporting: (e) => { 
                const workbook = new ExcelJS.Workbook();
                const worksheet = workbook.addWorksheet('Documents');
                DevExpress.excelExporter.exportDataGrid({ component: e.component, worksheet: worksheet, autoFilterEnabled: true })
                .then(() => {
                    workbook.xlsx.writeBuffer().then((buffer) => {
                        saveAs(new Blob([buffer], { type: 'application/octet-stream' }), `${e.component.option('export.fileName')}.xlsx`);
                    });
                });
                e.cancel = true;
            },
            loadPanel: { enabled: false },
            noDataText: __("No data to display"),
        }).dxDataGrid("instance");

      me.list_sidebar.parent.on("click", ".list-tag-preview", () => {
            
          
    me.toggle_tags();
});
        this.filter_area.filter_x_button.on("click",function () {
            
                   if (me.gridInstance) {
                   
                    
                    me.gridInstance.clearFilter();
            }
           
        });
if (this.list_view_settings?.show_search_box) {
    $(`#externalSearchBox_${doctype.replace(/\s+/g, '_')}`).dxTextBox({
        placeholder: __("Search..."),
        mode: "search",
        valueChangeEvent: "keyup input", 
        onValueChanged: (e) => {
            if(this.gridInstance) {
                this.gridInstance.searchByText(e.value);
            }
        }
    });
}
       

        function map_frappe_field_type_to_dx(ftype) {
            switch (ftype) {
                case 'Int': case 'Float': case 'Currency': case 'Percent': return 'number';
                case 'Date': return 'date';
                case 'Datetime': return 'datetime';
                case 'Check': return 'boolean';
                default: return 'string';
            }
        }
    }
};

