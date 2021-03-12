;
'use strict';
let $ = $ || window.jQuery;

// 是否是空
function isBlank(obj) {
    if (obj == undefined || obj == null || obj == "" || $.trim(obj.toString()) == "") {
        return true;
    }
    return false;
}

// 是否不为空
function isNotBlank(obj) {
    return !isBlank(obj);
}

/**
 * 获取文件扩展名（类型）
 * @param {Object} filename	文件名
 */
function getFileExtension(filename) {
    var startIndex = filename.lastIndexOf(".");
    if (startIndex == -1) {
        return "";
    }
    return filename.substring(startIndex + 1, filename.length).toLowerCase();
}

/**
 * 判断文件类型是否正确
 * @param {Object} types	允许文件类型数组
 * @param {Object} filename	文件名
 */
function isFileType(types, filename) {
    var fileExtension = getFileExtension(filename);
    if (fileExtension == "") {
        return false;
    }
    // return types.indexOf(fileExtension);
    var flag = false;
    types.find(function(value) {
        if (value == fileExtension) {
            flag = true;
            return;
        }
    });
    return flag;
}

/**
 * 获取文件大小
 * @param {Object} target input 文件框对象
 * @return 返回文件大小，单位 KB
 */
function getFileSize(target) {
    var isIE = /msie/i.test(navigator.userAgent) && !window.opera;
    var fileSize = 0;
    if (isIE && !target.files) {
        var filePath = target.value;
        var fileSystem = new ActiveXObject("Scripting.FileSystemObject");
        var file = fileSystem.GetFile(filePath);
        fileSize = file.Size;
    } else {
        fileSize = target.files[0].size;
    }
    return fileSize / 1024;
};

/**
 * 清空 input 框文件内容
 * @param {Object} _this
 * @param {Object} browserVersion
 */
function clearInput(_this, browserVersion) {
    _this.value = "";
    if (browserVersion.indexOf("MSIE") > -1) {
        _this.select();
        document.selection.clear();
    }
    // 重新初始化 input 框的 html
    _this.outerHTML = _this.outerHTML;
}

// 配置池，单页面可以创建多个实例
var d7c_file_config_pool = {};

function D7CFileUpload(options) {
    // 实例默认配置
    this.config = {
        "container": "containerId", // 容器编号
        "data": {}, // 数据
        "name": "file", // input name 属性名
        "dataKey": ['id', 'name', 'uri'], // 数据 json 中的键值
        "append": false, // 是否追加
        "async": true, // 是否异步请求
        "max_num": 10, // 同步请求时每次最大上传数量
        "max_size": 100, // 单个上传文件的最大大小 KB
        "fileTypeStr": ["jpg", "png", "gif", "bmp", "jpeg"], // 允许上传的文件类型，例如支持的文档类型：["doc", "docx", "ppt", "pptx", "xls", "xlsx", "pdf", "txt"]
        "fileType": 1, // 上传的文件类型，1：图片，2：文档
        "next_del_id": 0, // 下一个删除按钮的 id 编号
        "del_uri": "", // 删除图片 uri
        "del_type": "POST", // 删除图片的请求方式
        "del_data": {}, // 删除图片时传递的数据
        "del_success": null, // 删除成功回调函数
        "del_error": null, // 删除失败回调函数
        "upload_uri": "", // 上传图片 uri
        "upload_data": {}, // 上传图片时传递的数据
        "upload_success": null, // 上传成功回调函数
        "upload_error": null, // 上传失败回调函数
        "errorMsg": null, // 错误消息提示函数
    };

    // 初始化当前实例配置
    this.initConfig(options);
}

// 初始化当前实例配置
D7CFileUpload.prototype.initConfig = function(options) {
    if (!$.isEmptyObject(options)) {
        let that = this;
        $.each(options, function(index, value) {
            that.config[index] = value;
        });
    }
    d7c_file_config_pool[this.config.container] = this.config;
}

// 获取属性值，如果 options 中有值就取 options 中的值，否则取默认配置中的值
D7CFileUpload.prototype.getValueByKey = function(options, key) {
    if ($.isEmptyObject(options)) {
        return this.config[key];
    }
    return isBlank(options[key]) ? this.config[key] : options[key];
}

/**
 * 初始化文件列表
 * @param {Object} options  选项对象
 */
D7CFileUpload.prototype.initFileList = function(options) {
    let container = this.getValueByKey(options, "container");
    let html = '<ul class="filelist" id="' + container + '_ul">',
        num = 0, // 文件数量
        data = this.getValueByKey(options, "data");
    if (!$.isEmptyObject(data)) {
        num = data.length;
        let keys = this.getValueByKey(options, "dataKey");
        $.each(data, function(index, value) {
            html += '<li><span ' + keys[0] + '=\'' + value[keys[0]] + '\' ' + keys[1] + '=\'' + value[keys[1]] +
                '\' class="red"><i class="ace-icon fa fa-trash-o bigger-130 red"></i></span>' +
                '<a onclick="window.open(\'' + value[keys[2]] + '\')">' +
                '<img src="' + value[keys[2]] + '" /></a></li>';
        });
        // 删除配置中的数据，因为已经显示了，所以要释放空间
        delete this.config.data;
    }
    html += '</ul>';

    // 追加模式，并且还可以继续追加
    if (this.getValueByKey(options, "append") && this.getValueByKey(options, "max_num") > num) {
        html += '<input type="file" name="' + this.getValueByKey(options, "name") + '" style="width: 0; height: 0;" />';
        html += '<a class="choose_a"><i class="fa fa-plus fa-5x"></i></a>';
    }
    $("#" + container).append(html);

    // 给图片绑定删除事件
    this.spanAddClick(options, container);

    // 给追加按钮添加点击事件
    this.appendButton(options);
}

// 给图片绑定删除事件
D7CFileUpload.prototype.spanAddClick = function(options, container) {
    let that = this;
    let keys = that.getValueByKey(options, "dataKey");
    $("#" + container + " ul li span").on("click", function() {
        that.deleteFile(this, $(this).attr(keys[0]), $(this).attr(keys[1]))
    });
}

// 给追加按钮添加点击事件
D7CFileUpload.prototype.appendButton = function(options) {
    var num = $("#" + this.getValueByKey(options, "container") + " > ul li").length;
    if (this.getValueByKey(options, "append") && this.getValueByKey(options, "max_num") > num) {
        // 文件列表末尾增加一个 input 内容改变事件
        this.appendInputChange(options);
        // 文件列表末尾增加一个模拟点击 input 的自定义按钮
        this.appendInputClick(options);
    }
}

// 文件列表末尾增加一个 input 内容改变事件
D7CFileUpload.prototype.appendInputChange = function(options) {
    let that = this;
    let container = that.getValueByKey(options, "container");
    $("#" + container + " > input[display!=none]").on("change", function() {
        // 获取当前容器配置参数
        var config = d7c_file_config_pool[container];
        // 获取浏览器类型
        var browserVersion = window.navigator.userAgent.toUpperCase();

        // 文件类型检测
        if (!isFileType(config.fileTypeStr, this.value)) {
            clearInput(this, browserVersion);
            errorMsg('仅支持 ' + config.fileTypeStr.join() + ' 为后缀名的文件!');
            return;
        }

        // 上传文件大小检测
        if (getFileSize(this) > Number(config.max_size)) {
            clearInput(this, browserVersion);
            errorMsg('文件不能大于' + config.max_size + 'KB!');
            return;
        }

        // 单次上传数量检测
        var file_num = $('#' + container + ' input[name=' + this.name + ']').length;
        if (!config.async // 是否是异步请求，true 是
            &&
            file_num > Number(config.max_num)) {
            clearInput(this, browserVersion);
            errorMsg('单次上传文件数量不能大于' + config.max_num + '张!');
            return;
        }

        if (config.fileType == 1) { // 图片类型
            choosePicture(this, config);
        } else if (config.fileType == 2) { // 文档类型
            chooseDoc(this, config);
        }
    });
}

// 错误消息提示
D7CFileUpload.prototype.errorMsg = function(msg) {
    let errorMsg = this.getValueByKey(options, "errorMsg");
    if (errorMsg) {
        errorMsg(msg);
    } else {
        alert(msg);
    }
}

// 文件列表末尾增加一个模拟点击 input 的自定义按钮
D7CFileUpload.prototype.appendInputClick = function(options) {
    let container = this.getValueByKey(options, "container");
    $("#" + container + " > a").on("click", function() {
        $("#" + container + " > input[display!=none]").click()
    });
}

/**
 * 删除文件
 * @param {Object} _this	span 对象
 * @param {Object} id		文件在数据库中的主键
 * @param {Object} name		文件的名称
 */
D7CFileUpload.prototype.deleteFile = function(_this, id, name) {
    console.log(_this)
    console.log(id)
    console.log(name)
}
/* function deleteFile(_this, id, name) {
    bootbox.confirm({
        title: "删除确认",
        message: "确定要删除[" + name + "]文件吗?",
        buttons: {
            confirm: {
                label: "<i class='ace-icon fa fa-trash-o bigger-110'></i>&nbsp; OK",
                className: 'btn btn-danger btn-xs'
            },
            cancel: {
                label: "<i class='ace-icon fa fa-times bigger-110'></i>&nbsp; Cancel",
                className: 'btn btn-xs'
            }
        },
        callback: function(result) {
            // 取消删除
            if (!result) {
                return;
            }
            if (isBlank(id)) { // 本地删除
                deleteLocalFile(_this);
            } else { // 本地和服务器都删除
                deleteServerFile(_this, id, name);
            }
        }
    });
}; */
