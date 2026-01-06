/**
 * Google API 設定檔
 * 使用 Google Apps Script Web App 作為後端
 */

const GOOGLE_CONFIG = {
    // Google Apps Script Web App URL
    GAS_WEB_APP_URL: 'https://script.google.com/macros/s/AKfycbw075bXIKE8TBzGfHfJzPwUbgUyicFJ_tz9KxU3zOoBV9mc6lOuH6dR31A8sidSHSbZzQ/exec',

    // 保留原有設定供參考
    SPREADSHEET_ID: '1OVl6BFpWfzsauR1djpOaO-PtraVhThPfgVzqD3-f3DI',
    DRIVE_FOLDER_ID: '1HaOhlYJhH2_8itI_7XQZkSikSzr2fAhy'

    // NOTE: 管理員密碼現在由後端 (Google Apps Script) 管理
    // 請在 GAS 編輯器中設定 ADMIN_PASSWORD
}



// 工作表名稱
const SHEET_NAMES = {
    ITEMS: 'items',
    CATEGORIES: 'categories'
}

