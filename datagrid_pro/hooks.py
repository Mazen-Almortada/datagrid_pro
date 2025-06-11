app_name = "datagrid_pro"
app_title = "DataGrid Pro"
app_publisher = "Quansoft"
app_description = "Frappe app that replaces the standard Frappe list view with a DevExtreme DataGrid. It provides functions for multi-column sorting and advanced row filtering. The interface includes drag-and-drop grouping and several other features."
app_email = "abobedro90@gmail.com"
app_license = "mit"

# Apps
# ------------------

# required_apps = []

# Each item in the list will be shown as an app in the apps page
# add_to_apps_screen = [
# 	{
# 		"name": "datagrid_pro",
# 		"logo": "/assets/datagrid_pro/logo.png",
# 		"title": "DataGrid Pro",
# 		"route": "/datagrid_pro",
# 		"has_permission": "datagrid_pro.api.permission.has_app_permission"
# 	}
# ]
fixtures = [
    {"dt":"Custom Field",
    "filters":[
        ["module","=","DataGrid Pro"]
    ]
        
        }
]
# Includes in <head>
# ------------------

app_include_js = [
    "https://cdnjs.cloudflare.com/ajax/libs/babel-polyfill/7.4.0/polyfill.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.2/FileSaver.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js",
    "/assets/datagrid_pro/js/datagrid_pro.js",
    "/assets/datagrid_pro/js/dx.all.js"
]
 
app_include_css = [
    "/assets/datagrid_pro/css/dx.material.blue.light.css",
        "/assets/datagrid_pro/css/datagrid_pro.css"

]
# include js, css files in header of web template
# web_include_css = "/assets/datagrid_pro/css/datagrid_pro.css"
# web_include_js = "/assets/datagrid_pro/js/datagrid_pro.js"

# include custom scss in every website theme (without file extension ".scss")
# website_theme_scss = "datagrid_pro/public/scss/website"

# include js, css files in header of web form
# webform_include_js = {"doctype": "public/js/doctype.js"}
# webform_include_css = {"doctype": "public/css/doctype.css"}

# include js in page
# page_js = {"page" : "public/js/file.js"}

# include js in doctype views
# doctype_js = {"doctype" : "public/js/doctype.js"}
# doctype_list_js = {"doctype" : "public/js/doctype_list.js"}
# doctype_tree_js = {"doctype" : "public/js/doctype_tree.js"}
# doctype_calendar_js = {"doctype" : "public/js/doctype_calendar.js"}

# Svg Icons
# ------------------
# include app icons in desk
# app_include_icons = "datagrid_pro/public/icons.svg"

# Home Pages
# ----------

# application home page (will override Website Settings)
# home_page = "login"

# website user home page (by Role)
# role_home_page = {
# 	"Role": "home_page"
# }

# Generators
# ----------

# automatically create page for each record of this doctype
# website_generators = ["Web Page"]

# Jinja
# ----------

# add methods and filters to jinja environment
# jinja = {
# 	"methods": "datagrid_pro.utils.jinja_methods",
# 	"filters": "datagrid_pro.utils.jinja_filters"
# }

# Installation
# ------------

# before_install = "datagrid_pro.install.before_install"
# after_install = "datagrid_pro.install.after_install"

# Uninstallation
# ------------

# before_uninstall = "datagrid_pro.uninstall.before_uninstall"
# after_uninstall = "datagrid_pro.uninstall.after_uninstall"

# Integration Setup
# ------------------
# To set up dependencies/integrations with other apps
# Name of the app being installed is passed as an argument

# before_app_install = "datagrid_pro.utils.before_app_install"
# after_app_install = "datagrid_pro.utils.after_app_install"

# Integration Cleanup
# -------------------
# To clean up dependencies/integrations with other apps
# Name of the app being uninstalled is passed as an argument

# before_app_uninstall = "datagrid_pro.utils.before_app_uninstall"
# after_app_uninstall = "datagrid_pro.utils.after_app_uninstall"

# Desk Notifications
# ------------------
# See frappe.core.notifications.get_notification_config

# notification_config = "datagrid_pro.notifications.get_notification_config"

# Permissions
# -----------
# Permissions evaluated in scripted ways

# permission_query_conditions = {
# 	"Event": "frappe.desk.doctype.event.event.get_permission_query_conditions",
# }
#
# has_permission = {
# 	"Event": "frappe.desk.doctype.event.event.has_permission",
# }

# DocType Class
# ---------------
# Override standard doctype classes

# override_doctype_class = {
# 	"ToDo": "custom_app.overrides.CustomToDo"
# }

# Document Events
# ---------------
# Hook on document methods and events

# doc_events = {
# 	"*": {
# 		"on_update": "method",
# 		"on_cancel": "method",
# 		"on_trash": "method"
# 	}
# }

# Scheduled Tasks
# ---------------

# scheduler_events = {
# 	"all": [
# 		"datagrid_pro.tasks.all"
# 	],
# 	"daily": [
# 		"datagrid_pro.tasks.daily"
# 	],
# 	"hourly": [
# 		"datagrid_pro.tasks.hourly"
# 	],
# 	"weekly": [
# 		"datagrid_pro.tasks.weekly"
# 	],
# 	"monthly": [
# 		"datagrid_pro.tasks.monthly"
# 	],
# }

# Testing
# -------

# before_tests = "datagrid_pro.install.before_tests"

# Overriding Methods
# ------------------------------
#
# override_whitelisted_methods = {
# 	"frappe.desk.doctype.event.event.get_events": "datagrid_pro.event.get_events"
# }
#
# each overriding function accepts a `data` argument;
# generated from the base implementation of the doctype dashboard,
# along with any modifications made in other Frappe apps
# override_doctype_dashboards = {
# 	"Task": "datagrid_pro.task.get_dashboard_data"
# }

# exempt linked doctypes from being automatically cancelled
#
# auto_cancel_exempted_doctypes = ["Auto Repeat"]

# Ignore links to specified DocTypes when deleting documents
# -----------------------------------------------------------

# ignore_links_on_delete = ["Communication", "ToDo"]

# Request Events
# ----------------
# before_request = ["datagrid_pro.utils.before_request"]
# after_request = ["datagrid_pro.utils.after_request"]

# Job Events
# ----------
# before_job = ["datagrid_pro.utils.before_job"]
# after_job = ["datagrid_pro.utils.after_job"]

# User Data Protection
# --------------------

# user_data_fields = [
# 	{
# 		"doctype": "{doctype_1}",
# 		"filter_by": "{filter_by}",
# 		"redact_fields": ["{field_1}", "{field_2}"],
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_2}",
# 		"filter_by": "{filter_by}",
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_3}",
# 		"strict": False,
# 	},
# 	{
# 		"doctype": "{doctype_4}"
# 	}
# ]

# Authentication and authorization
# --------------------------------

# auth_hooks = [
# 	"datagrid_pro.auth.validate"
# ]

# Automatically update python controller files with type annotations for this app.
# export_python_type_annotations = True

# default_log_clearing_doctypes = {
# 	"Logging DocType Name": 30  # days to retain logs
# }

