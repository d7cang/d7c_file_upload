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
    let startIndex = filename.lastIndexOf(".");
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
    let fileExtension = getFileExtension(filename);
    if (fileExtension == "") {
        return false;
    }
    // return types.indexOf(fileExtension);
    let flag = false;
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
    let isIE = /msie/i.test(navigator.userAgent) && !window.opera;
    let fileSize = 0;
    if (isIE && !target.files) {
        let filePath = target.value;
        let fileSystem = new ActiveXObject("Scripting.FileSystemObject");
        let file = fileSystem.GetFile(filePath);
        fileSize = file.Size;
    } else {
        fileSize = target.files[0].size;
    }
    return fileSize / 1024;
}

/**
 * 获取图片本地预览 url
 * @param {Object} _this	input 框对象
 */
function getFileUrl(_this) {
    let url = "#";
    if (window.createObjectURL != undefined) {
        url = window.createObjectURL(_this.files[0]);
    } else if (window.URL != undefined) {
        url = window.URL.createObjectURL(_this.files[0]);
    } else if (window.webkitURL != undefined) {
        url = window.webkitURL.createObjectURL(_this.files[0]);
    }
    return url;
}

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
    // 实例默认配置，参数类型 N 类：初始化后不可变，M 类：初始化后可变
    this.config = {
        "container": "containerId", // 容器编号 N
        "data": {}, // 数据 M
        "name": "file", // input name 属性名 N
        "dataKey": ['id', 'name', 'uri'], // 数据 json 中的键值 N
        "append": false, // 是否追加 N
        "async": true, // 是否异步请求 M
        "max_num": 10, // 同步请求时每次最大上传数量 N
        "max_size": 100, // 单个上传文件的最大大小 KB N
        "fileTypeStr": ["jpg", "png", "gif", "bmp", "jpeg"], // 允许上传的文件类型，例如支持的文档类型：["doc", "docx", "ppt", "pptx", "xls", "xlsx", "pdf", "txt"] N
        "fileType": 1, // 上传的文件类型，1：图片，2：文档 N
        "next_del_id": 0, // 下一个删除按钮的 id 编号 N
        "del_uri": "", // 删除图片 uri M
        "del_type": "POST", // 删除图片的请求方式 M
        "del_data": {}, // 删除图片时传递的数据 M
        "del_success": null, // 删除成功回调函数 M
        "del_error": null, // 删除失败回调函数 M
        "upload_uri": "", // 上传图片 uri M
        "upload_data": {}, // 上传图片时传递的数据 M
        "upload_success": null, // 上传成功回调函数 M
        "upload_error": null, // 上传失败回调函数 M
        "successMsg": null, // 成功消息提示函数 M
        "errorMsg": null, // 错误消息提示函数 M
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
    if ((this.config["container"] + '_span') == this.config["dataKey"][0]) {
        throw new Error("dataKey 的第一个属性不能为" + this.config["container"] + "_span！");
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
    let container = this.config["container"];
    let html = '<ul class=\'d7c-file-ul\'>',
        num = 0, // 文件数量
        data = this.getValueByKey(options, "data");
    if (!$.isEmptyObject(data)) {
        num = data.length;
        let keys = this.config["dataKey"];

        $.each(data, function(index, value) {
            html += '<li class=\'d7c-file-li\'>';
            html += '<span class=\'d7c-file-del-span\' ' + keys[0] + '=\'' + value[keys[0]] + '\' ' +
                keys[1] + '=\'' + value[keys[1]] + '\'><i class=\'d7c-file-del-icon\'></i></span>';
            html += '<a class=\'d7c-file-a\' onclick="window.open(\'' + value[keys[2]] + '\')">';
            html += '<img class=\'d7c-file-img\' src=\'' + value[keys[2]] + '\' />';
            html += '<span class=\'d7c-file-text-span\'>' + value[keys[1]] + '</span></a></li>';
        });

        // 删除配置中的数据，因为已经显示了，所以要释放空间
        delete this.config.data;
    }
    html += '</ul>';

    // 追加模式，并且还可以继续追加
    if (this.config["append"] && this.config["max_num"] > num) {
        html += '<input type=\'file\' name=\'' + this.config["name"] + '\' style=\'width: 0; height: 0;\' />';
        html += '<a class=\'d7c-file-a-choose\'><i class=\'d7c-file-choose-icon\'></i></a>';
    }
    $("#" + container).append(html);

    // 给图片绑定删除事件
    this.spanAddClick(options);

    // 给追加按钮添加点击事件
    this.appendButton(options);
}

// 给图片绑定删除事件
D7CFileUpload.prototype.spanAddClick = function(options) {
    let that = this;
    let keys = that.config["dataKey"];
    $("#" + that.config["container"] + " ul li span").on("click", function() {
        that.deleteFile(options, this, $(this).attr(keys[0]), $(this).attr(keys[1]));
    });
}

// 给追加按钮添加点击事件
D7CFileUpload.prototype.appendButton = function(options) {
    let num = $("#" + this.config["container"] + " > ul li").length;
    if (this.config["append"] && this.config["max_num"] > num) {
        // 文件列表末尾增加一个 input 内容改变事件
        this.appendInputChange(options);
        // 文件列表末尾增加一个模拟点击 input 的自定义按钮
        this.appendInputClick(options);
    }
}

// 文件列表末尾增加一个 input 内容改变事件
D7CFileUpload.prototype.appendInputChange = function(options) {
    let that = this;
    let container = that.config["container"];
    $("#" + container + " > input[display!=none]").on("change", function() {
        // 获取当前容器配置参数
        let config = d7c_file_config_pool[container];
        // 获取浏览器类型
        let browserVersion = window.navigator.userAgent.toUpperCase();

        // 文件类型检测
        if (!isFileType(config.fileTypeStr, this.value)) {
            clearInput(this, browserVersion);
            that.errorMsg('仅支持 ' + config.fileTypeStr.join() + ' 为后缀名的文件!');
            return;
        }

        // 上传文件大小检测
        if (getFileSize(this) > Number(config.max_size)) {
            clearInput(this, browserVersion);
            that.errorMsg('文件不能大于' + config.max_size + 'KB!');
            return;
        }

        // 单次上传数量检测
        let file_num = $('#' + container + ' input[name=' + that.config["name"] + ']').length;
        if (!config.async // 是否是异步请求，true 是
            &&
            file_num > Number(config.max_num)) {
            clearInput(this, browserVersion);
            that.errorMsg('单次上传文件数量不能大于' + config.max_num + '张!');
            return;
        }

        if (config.fileType == 1) { // 图片类型
            that.choosePicture(options, this);
        } else if (config.fileType == 2) { // 文档类型
            that.chooseDoc(options, this);
        }
    });
}

/**
 * 选择图片
 * @param {Object} options	容器配置参数
 * @param {Object} _this	input 框对象
 */
D7CFileUpload.prototype.choosePicture = function(options, _this) {
    let that = this;

    if (!_this) {
        that.errorMsg("请先选择图片！");
        return;
    }

    // 异步请求
    let async = that.getValueByKey(options, "async");
    if (async) {
        // 上传图片 uri
        let upload_uri = that.getValueByKey(options, "upload_uri");
        if (isBlank(upload_uri)) {
            that.errorMsg("上传图片 uri 为空，请配置 upload_uri 属性！");
            return;
        }

        let keys = that.config["dataKey"];

        /**
         * 通过 FormData 对象可以组装一组用  XMLHttpRequest 发送请求的键/值对。它可以更灵活方便的发送表单数据，因此可以独立于表单使用。
         * 如果把表单的编码类型设置为 multipart/form-data，则通过 FormData 传输的数据格式和表单通过 submit() 方法传输的数据格式相同。
         */
        let formData = new FormData();
        formData.append(keys[2], _this.files[0]);
        $.each(that.getValueByKey(options, "upload_data"), function(index, value) {
            formData.append(index, value);
        });

        let callbacks = $.Callbacks();
        $.ajax({
            url: upload_uri,
            type: "POST",
            data: formData,
            contentType: false, // 必须设置为 false 才会自动加上正确的 Content-Type。
            processData: false, // 必须设置为 false 才会避开 jQuery 对 formdata 的默认处理，XMLHttpRequest 会对 formdata 进行正确的处理。
            success: function(result) {
                if (result.status == 200) { // 上传成功
                    // 画图片显示区域
                    that.makePicture(options, _this, result.data[keys[0]]);
                }

                // 成功后回调执行
                let upload_success = that.getValueByKey(options, "upload_success");
                if (upload_success) {
                    callbacks.add(upload_success);
                    callbacks.fire(_this, result);
                } else {
                    if (result.status == 200) {
                        that.successMsg("上传成功!");
                    } else {
                        that.errorMsg("上传失败!");
                    }
                }
            },
            error: function(jqXHR, textStatus, errorThrown) {
                // 失败后回调执行
                let upload_error = that.getValueByKey(options, "upload_error");
                if (upload_error) {
                    callbacks.add(upload_error);
                    callbacks.fire(_this, jqXHR, textStatus, errorThrown);
                } else {
                    that.errorMsg("服务器异常!");
                }
            }
        });
    } else {
        that.makePicture(options, _this, "");
    }
}

/**
 * 画图片显示区域
 * @param {Object} options	容器配置参数
 * @param {Object} _this	input 框对象
 * @param {Object} fileId   文件在数据库中的主键
 */
D7CFileUpload.prototype.makePicture = function(options, _this, fileId) {
    let that = this;

    if (!_this) {
        that.errorMsg("请先选择图片！");
        return;
    }

    let container = that.config["container"];

    // 获取浏览器类型
    let browserVersion = window.navigator.userAgent.toUpperCase();

    // 单次上传数量检测
    let file_num = $('#' + container + ' input[name=' + _this.name + ']').length;
    /**
     * 是否显示追加文件按钮，必须在追加模式下：
     * 1、不是异步请求并且当前上传的文件数量小于单次请求允许上传的最大数量；
     * 2、是异步请求。
     */
    let is_can_append = that.config["append"] && (that.getValueByKey(options, "async") || file_num < Number(that.config["max_num"]));
    if (is_can_append) {
        // 克隆追加按钮
        let _clone_this = $(_this).clone();
        clearInput(_clone_this, browserVersion);
        // 将一个空的追加按钮放到容器最后
        $(_clone_this).appendTo("#" + container);
    }

    // 删除按钮的 id 编号
    let next_del_id = container + '_span_' + that.config['next_del_id'];
    // 更新配置池中下一个删除按钮的 id 编号
    d7c_file_config_pool[container]['next_del_id'] = next_del_id + 1;

    // 获取图片名称
    let filename = _this.files[0].name;
    // 获取图片本地预览 url
    let url = getFileUrl(_this);

    let keys = that.config["dataKey"];

    let li = '<li class=\'d7c-file-li\'><span class=\'d7c-file-del-span\' ' + container + '_span=\'' + next_del_id + '\' ';
    if (_this.files) { // HTML5实现预览，兼容 chrome、火狐 7+ 等
        if (window.FileReader) {
            let reader = new FileReader();
            reader.onload = function(e) {
                li += keys[0] + '=\'' + fileId + '\' ' + keys[1] + '=\'' + filename + '\'>';
                li += '<i class=\'d7c-file-del-icon\'></i></span>';
                li += '<a class=\'d7c-file-a\' onclick="window.open(\'' + url + '\')">';
                li += '<img class=\'d7c-file-img\' src=\'' + e.target.result + '\' />';
                li += '<span class=\'d7c-file-text-span\'>' + filename + '</span></a></li>';
                // 将新生成的 li 追加到原 ul 后
                $('#' + container + ' > ul').append(li);
            };
            reader.readAsDataURL(_this.files[0]);
        } else { // browserVersion.indexOf("SAFARI") > -1
            that.errorMsg('不支持 Safari6.0 以下浏览器的图片预览!');
        }
    } else {
        let _value = _this.value;
        if (browserVersion.indexOf("MSIE") > -1) {
            if (browserVersion.indexOf("MSIE 6") > -1) { // ie6
                li += keys[0] + '=\'' + fileId + '\' ' + keys[1] + '=\'' + filename + '\'>';
                li += '<i class=\'d7c-file-del-icon\'></i></span>';
                li += '<a class=\'d7c-file-a\' onclick="window.open(\'' + url + '\')">';
                li += '<img class=\'d7c-file-img\' src=\'' + _value + '\' />';
                li += '<span class=\'d7c-file-text-span\'>' + filename + '</span></a></li>';
                // 将新生成的 li 追加到原 ul 后
                $('#' + container + ' > ul').append(li);
            } else { // ie[7-9]
                _this.select();
                if (browserVersion.indexOf("MSIE 9") > -1) {
                    _this.blur(); // 不加 document.selection.createRange().text，在 ie9 中会拒绝访问
                }
                li += keys[0] + '=\'' + fileId + '\' ' + keys[1] + '=\'' + filename + '\'>';
                li += '<i class=\'d7c-file-del-icon\'></i></span>';
                li += '<a class=\'d7c-file-a\' onclick="window.open(\'' + url + '\')">';
                li += '<img class=\'d7c-file-img\' /><span class=\'d7c-file-text-span\'>' + filename + '</span></a></li>';
                let $li = $("#" + li);
                $li.style.filter = "progid:DXImageTransform.Microsoft.AlphaImageLoader(sizingMethod='scale',src='" + document.selection.createRange().text + "')";
                let $li_temp = $("#" + li);
                $li.parentNode.insertBefore($li, $li_temp);
                $li.style.display = "none";
                // 将新生成的 li 追加到原 ul 后
                $('#' + container + ' > ul').append($li_temp);
            }
        } else if (browserVersion.indexOf("FIREFOX") > -1) { // firefox
            let firefoxVersion = parseFloat(browserVersion.toLowerCase().match(/firefox\/([\d.]+)/)[1]);
            li += keys[0] + '=\'' + fileId + '\' ' + keys[1] + '=\'' + filename + '\'>';
            li += '<i class=\'d7c-file-del-icon\'></i></span>';
            li += '<a class=\'d7c-file-a\' onclick="window.open(\'' + url + '\')">';
            li += '<img class=\'d7c-file-img\' src=\'';
            if (firefoxVersion < 7) { // firefox7 以下版本
                li += _this.files[0].getAsDataURL();
            } else { // firefox7.0+
                li += window.URL.createObjectURL(_this.files[0]);
            }
            li += '\' /><span class=\'d7c-file-text-span\'>' + filename + '</span></a></li>';
            // 将新生成的 li 追加到原 ul 后
            $('#' + container + ' > ul').append(li);
        } else {
            li += keys[0] + '=\'' + fileId + '\' ' + keys[1] + '=\'' + filename + '\'>';
            li += '<i class=\'d7c-file-del-icon\'></i></span>';
            li += '<a class=\'d7c-file-a\' onclick="window.open(\'' + url + '\')">';
            li += '<img class=\'d7c-file-img\' src=\'' + _value + '\' />';
            li += '<span class=\'d7c-file-text-span\'>' + filename + '</span></a></li>';
            // 将新生成的 li 追加到原 ul 后
            $('#' + container + ' > ul').append(li);
        }
    }

    // 给 span 添加删除事件
    that.deleteFile(options, $("#" + container + " ul li span[" + container + "_span=" + next_del_id + "]"), fileId, filename);

    // 将当前 input 隐藏并设置删除 id
    $(_this).attr('display', 'none').attr("del", next_del_id);
}

/**
 * 选择文档
 * @param {Object} options	容器配置参数
 * @param {Object} _this	input 框对象
 */
D7CFileUpload.prototype.chooseDoc = function(options, _this) {
    let that = this;

    if (!_this) {
        that.errorMsg("请先选择文档！");
        return;
    }

    if (that.getValueByKey(options, "async")) { // 异步请求
        // 上传文档 uri
        let upload_uri = that.getValueByKey(options, "upload_uri");
        if (isBlank(upload_uri)) {
            that.errorMsg("上传文档 uri 为空，请配置 upload_uri 属性！");
            return;
        }

        let keys = that.config["dataKey"];

        /**
         * 通过 FormData 对象可以组装一组用 XMLHttpRequest 发送请求的键/值对。它可以更灵活方便的发送表单数据，因此可以独立于表单使用。
         * 如果把表单的编码类型设置为 multipart/form-data，则通过 FormData 传输的数据格式和表单通过 submit() 方法传输的数据格式相同。
         */
        let formData = new FormData();
        formData.append(keys[2], _this.files[0]);
        $.each(that.getValueByKey(options, "upload_data"), function(index, value) {
            formData.append(index, value);
        });

        let callbacks = $.Callbacks();
        $.ajax({
            url: upload_uri,
            type: "POST",
            data: formData,
            contentType: false, // 必须设置为 false 才会自动加上正确的 Content-Type。
            processData: false, // 必须设置为 false 才会避开 jQuery 对 formdata 的默认处理，XMLHttpRequest 会对 formdata 进行正确的处理。
            success: function(result) {
                if (result.status == 200) { // 上传成功
                    // 画文档显示区域
                    that.makeDoc(options, _this, result.data[keys[0]]);
                }

                // 成功后回调执行
                let upload_success = that.getValueByKey(options, "upload_success");
                if (upload_success) {
                    callbacks.add(upload_success);
                    callbacks.fire(_this, result);
                } else {
                    if (result.status == 200) {
                        that.successMsg("上传成功!");
                    } else {
                        that.errorMsg("上传失败!");
                    }
                }
            },
            error: function(jqXHR, textStatus, errorThrown) {
                // 失败后回调执行
                let upload_error = that.getValueByKey(options, "upload_error");
                if (upload_error) {
                    callbacks.add(upload_error);
                    callbacks.fire(_this, jqXHR, textStatus, errorThrown);
                } else {
                    that.errorMsg("服务器异常!");
                }
            }
        });
    } else {
        that.makeDoc(options, _this, "");
    }
}

/**
 * 画文档显示区域
 * @param {Object} options	容器配置参数
 * @param {Object} _this	input 框对象
 * @param {Object} fileId   文件在数据库中的主键
 */
D7CFileUpload.prototype.makeDoc = function(options, _this, fileId) {
    let that = this;

    if (!_this) {
        that.errorMsg("请先选择文档！");
        return;
    }

    let container = that.config["container"];

    // 获取浏览器类型
    let browserVersion = window.navigator.userAgent.toUpperCase();

    // 单次上传数量检测
    let file_num = $('#' + container + ' input[name=' + _this.name + ']').length;
    /**
     * 是否显示追加文件按钮，必须在追加模式下：
     * 1、不是异步请求并且当前上传的文件数量小于单次请求允许上传的最大数量；
     * 2、是异步请求。
     */
    let is_can_append = that.config["append"] && (that.getValueByKey(options, "async") || file_num < Number(that.config["max_num"]));
    if (is_can_append) {
        // 克隆追加按钮
        let _clone_this = $(_this).clone();
        clearInput(_clone_this, browserVersion);
        // 将一个空的追加按钮放到容器最后
        $(_clone_this).appendTo("#" + container);
    }

    // 删除按钮的 id 编号
    let next_del_id = container + '_span_' + that.config['next_del_id'];
    // 更新配置池中下一个删除按钮的 id 编号
    d7c_file_config_pool[container]['next_del_id'] = next_del_id + 1;

    // 画文档显示区域
    let keys = that.config["dataKey"];
    let filename = _this.files[0].name;
    let li = '<li class=\'d7c-file-li\'>';
    li += '<span class=\'d7c-file-del-span\' ' + container + '_span=\'' + next_del_id + '\' ' + keys[0] + '=\'' + fileId + '\' ' + keys[1] + '=\'' + filename + '\'>';
    li += '<i class=\'d7c-file-del-icon\'></i></span>';
    li += '<a class=\'d7c-file-a\'><i class=\'d7c-file-doc-icon\'></i>';
    li += '<span class=\'d7c-file-text-span\'>' + filename + '</span></a></li>';
    // 将新生成的 li 追加到原 ul 后
    $('#' + container + ' > ul').append(li);

    // 给 span 添加删除事件
    that.deleteFile(options, $("#" + container + " ul li span[" + container + "_span=" + next_del_id + "]"), fileId, filename);

    // 将当前 input 隐藏并设置删除 id
    $(_this).attr('display', 'none').attr("del", next_del_id);
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

// 成功消息提示
D7CFileUpload.prototype.successMsg = function(msg) {
    let successMsg = this.getValueByKey(options, "successMsg");
    if (successMsg) {
        successMsg(msg);
    } else {
        alert(msg);
    }
}

// 文件列表末尾增加一个模拟点击 input 的自定义按钮
D7CFileUpload.prototype.appendInputClick = function(options) {
    let container = this.config["container"];
    $("#" + container + " > a").on("click", function() {
        $("#" + container + " > input[display!=none]").click()
    });
}

/**
 * 删除文件
 * @param {Object} options	容器配置参数
 * @param {Object} _this	span 对象
 * @param {Object} id		文件在数据库中的主键
 * @param {Object} name		文件的名称
 */
D7CFileUpload.prototype.deleteFile = function(options, _this, id, name) {
    if (isBlank(id)) { // 本地删除
        this.deleteLocalFile(options, _this, id, name);
    } else { // 即从本地删除，也要从服务端删除
        this.deleteServerFile(options, _this, id, name);
    }
}

/**
 * 删除页面未上传的文件
 * @param {Object} _this	span 对象
 * @param {Object} id		文件在数据库中的主键
 * @param {Object} name		文件的名称
 */
D7CFileUpload.prototype.deleteLocalFile = function(options, _this, id, name) {
    if (!_this) {
        this.errorMsg("请选择删除对象！");
        return;
    }

    let container = this.config["container"];
    // 获取 span 标签上绑定的 container + "_span" 属性值
    let container_span = $(_this).attr(container + "_span");
    if (!isBlank(container_span)) {
        // 获取 input 框上 del 属性的值为 container_span 的 input 对象
        let $input = $("#" + container + " input[del=" + container_span + "]");

        // 清空 input 框文件内容
        clearInput($input, window.navigator.userAgent.toUpperCase());
        // 删除 input 框
        $input.remove();
    }

    // 获取当前要删除对象的 li 对象
    let $li = $(_this).parent("li");
    // 删除 li
    $li.remove();
}

/**
 * 删除服务器上和本地文件
 * @param {Object} _this	span 对象
 * @param {Object} id		文件在数据库中的主键
 * @param {Object} name		文件的名称
 */
D7CFileUpload.prototype.deleteServerFile = function(options, _this, id, name) {
    let that = this;

    if (!_this) {
        that.errorMsg("请选择删除对象！");
        return;
    }

    let container = that.config["container"];

    // 删除图片 uri
    let del_uri = that.getValueByKey(options, "del_uri");
    if (isBlank(del_uri)) {
        that.errorMsg("删除图片 uri 为空，请配置 del_uri 属性！");
        return;
    }
    let keys = that.config.dataKey;
    let callbacks = $.Callbacks();

    // 获取当前要删除对象的 li 对象
    let $li = $(_this).parent("li");
    // ajax 请求删除文件
    let del_type = that.getValueByKey(options, "del_type");
    if ("POST" == del_type.toLowerCase()) { // POST 请求
        let del_data = that.getValueByKey(options, "del_data");
        del_data[keys[0]] = id;
        del_data[keys[1]] = name;
        $.ajax({
            type: del_type,
            data: del_data,
            url: del_uri,
            async: true,
            success: function(result) {
                if (result.status == 200) { // 删除成功
                    // 删除页面未上传的文件
                    that.deleteLocalFile(options, _this, id, name);
                }

                // 成功后回调执行
                let del_success = that.getValueByKey(options, "del_success");
                if (del_success) {
                    callbacks.add(del_success);
                    callbacks.fire(_this, result);
                } else {
                    if (result.status == 200) {
                        that.successMsg("删除成功!");
                    } else {
                        that.errorMsg("删除失败!");
                    }
                }
            },
            error: function(jqXHR, textStatus, errorThrown) {
                // 失败后回调执行
                let del_error = that.getValueByKey(options, "del_error");
                if (del_error) {
                    callbacks.add(del_error);
                    callbacks.fire(_this, jqXHR, textStatus, errorThrown);
                } else {
                    that.errorMsg("服务器异常!");
                }
            }
        });
    } else { // 使用 GET 请求
        let url = del_uri + '?' + keys[0] + '=' + id + '&' + keys[1] + '=' + name + '&tm=' + new Date().getTime();
        $.get(url, function(result) {
            if (result.status == 200) { // 删除成功
                // 删除页面未上传的文件
                that.deleteLocalFile(options, _this, id, name);
            }

            // 成功后回调执行
            let del_success = that.getValueByKey(options, "del_success");
            if (del_success) {
                callbacks.add(del_success);
                callbacks.fire(_this, result);
            } else {
                if (result.status == 200) {
                    that.successMsg("删除成功!");
                } else {
                    that.errorMsg("删除失败!");
                }
            }
        });
    }
}

/**
 * 在 img 标签中显示 input 标签中的图片内容
 * @param {Object} options		容器配置参数
 * @param {Object} _this		input 文件框对象（document 或 jQuery 对象）
 * @param {Object} imgContainer	画 img 标签的容器（document 或 jQuery 对象）
 * @param {Object} callBack		回调函数
 */
D7CFileUpload.prototype.showImages = function(options, _this, imgContainer, callBack) {
    let that = this;

    // 错误消息
    let msg = null;

    if (!_this) {
        msg = '请先选择文档！';
        if (callBack) {
            callBack(msg);
        } else {
            that.errorMsg(msg);
        }
        return;
    }

    let img = '<img ' + that.getValueByKey(options, "img_style") + ' src=\'';
    if (_this.files) { // HTML5 实现预览，兼容 chrome、火狐 7+ 等
        if (window.FileReader) {
            let reader = new FileReader();
            reader.onload = function(e) {
                img += e.target.result + '\' />';
                $(imgContainer).append(img);
            };
            reader.readAsDataURL(_this.files[0]);
        } else { // browserVersion.indexOf("SAFARI") > -1
            msg = '不支持 Safari6.0 以下浏览器的图片预览!';
            if (callBack) {
                callBack(msg);
            } else {
                that.errorMsg(msg);
            }
            return;
        }
    } else {
        // 获取浏览器类型
        let browserVersion = window.navigator.userAgent.toUpperCase();
        let _value = _this.value;
        if (browserVersion.indexOf("MSIE") > -1) {
            if (browserVersion.indexOf("MSIE 6") > -1) { // ie6
                img += _value + '\' />';
                $(imgContainer).append(img);
            } else { // ie[7-9]
                _this.select();
                if (browserVersion.indexOf("MSIE 9") > -1) {
                    _this.blur(); // 不加 document.selection.createRange().text，在 ie9 中会拒绝访问
                }
                img += '\' />';
                let $img = $("#" + img);
                $img.style.filter = "progid:DXImageTransform.Microsoft.AlphaImageLoader(sizingMethod='scale',src='" + document.selection.createRange().text + "')";
                let $img_temp = $("#" + img);
                $img.parentNode.insertBefore($img, $img_temp);
                $img.style.display = "none";
                $(imgContainer).append($img_temp);
            }
        } else if (browserVersion.indexOf("FIREFOX") > -1) { // firefox
            let firefoxVersion = parseFloat(browserVersion.toLowerCase().match(/firefox\/([\d.]+)/)[1]);
            if (firefoxVersion < 7) { // firefox7 以下版本
                img += _this.files[0].getAsDataURL() + '\' />';
            } else { // firefox7.0+
                img += window.URL.createObjectURL(_this.files[0]) + '\' />';
            }
            $(imgContainer).append(img);
        } else {
            img += _value + '\' />';
            $(imgContainer).append(img);
        }
    }
}

;
