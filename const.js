
// Database data schema
// difference between guest and a user? A user has login info.
// sessions|session_cookie: user_id
// users|user_id:
// user_config|user_id: config
// user_sessions|user_id: [session_cookies]
// user_logins|user_id: {username, password, salt}
// app_data|app_name: { user_states : state } 

exports.USERS = "users|";
exports.SAVE_INTERVAL = 10*1000;
exports.PASSWORD_FIELD_PREFIX = "cmd_password_input_";
exports.APP_DATA = "app_data|";
exports.USER_SESSIONS = "user_sessions|";
exports.USER_CONFIGS = "user_configs|";
exports.USER_LOGINS = "user_logins|";
exports.USER_INFOS = "user_infos|";
exports.USER_APP_DATA = "user_app_data|";
exports.COOKIE = "cookie|";
exports.SESSION_COOKIE_LEN = 20;
exports.USER_ID_LEN = 10;
exports.PASSWORD_MINLENGTH = 6;
exports.SESSION_COOKIE_NAME = "SessionCookie";
exports.GUEST_ID = "|GUEST|";

