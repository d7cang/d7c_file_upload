;
'use strict';
// 是否是空
function isBlank(obj) {
    if (obj == undefined || obj == null || obj == "" || jQuery.trim(obj.toString()) == "") {
        return true;
    }
    return false;
}

// 是否不为空
function isNotBlank(obj) {
    return !isBlank(obj);
}

function D7CFileUpload() {

}
