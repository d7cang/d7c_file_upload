/**
 * https://www.gulpjs.com.cn/docs/getting-started/quick-start/
 * 以下代码都是由 node 执行。
 * gulp 主配置文件任务：
 * 1、less 文件编译、压缩、合并；
 * 2、JS 文件压缩、混淆；
 * 3、HTML 文件压缩；
 * 4、image 文件拷贝；
 * 5、fonts 字体文件拷贝；
 * 6、实时同步效果到客户端。
 *
 * 启动命令：gulp / gulp build
 *
 * 项目入口：http://ip:port/index.html
 */
'use strict';

// 定义操作目录
const paths = {
    css: {
        src: ['src/css/**/*.css', 'src/css/**/*.less', '!src/css/**/_*.less'],
        dest: 'dist/css/',
        iswatch: true,
    },
    js: {
        src: ['src/js/**/*.js'],
        dest: 'dist/js/',
        iswatch: true,
    },
    html: {
        src: ['src/**/*.html', 'src/index.html'],
        dest: 'dist/',
        iswatch: true,
    },
    images: {
        src: ['src/images/**/*.*'],
        dest: 'dist/images/',
        iswatch: false,
    },
    copy: [{
            src: 'src/favicon.ico',
            dest: 'dist/'
        },
        {
            src: 'src/fonts/*.*',
            dest: 'dist/fonts/'
        }
    ],
    base_src: 'src', // 资源父目录
    base_dest: 'dist', // 目标父目录
}

/**
 * 载入 Gulp 模块
 * src() 创建一个流，从文件系统读取文件对象；
 * dest() 创建一个流将文件对象写入到文件系统；
 * symlink() 创建一个流，用于连接文件对象到文件系统；
 * lastRun() 检索在当前运行进程中成功完成任务的最后一次时间；
 * series() 组合任务并按顺序执行任务；
 * parallel() 组合任务并并行地执行任务；
 * watch() 监听 globs 并在发生更改时运行任务；
 * registry() 允许将自定义的注册表插入到任务系统中，以期提供共享任务或增强功能；
 * tree() 获取当前任务依赖关系树。
 */
const gulp = require('gulp');

// 清空编译目录
const del = require('del');

function clean() {
    return del(paths.base_dest);
}

// 操作 css
const less = require('gulp-less');
const cleanCSS = require('gulp-clean-css');
const cssnano = require('gulp-cssnano');
const rename = require('gulp-rename');

function css() {
    let css = gulp.src(paths.css.src)
        .pipe(less()) // 编译 less
        .pipe(cleanCSS()) // 清理 css
        .pipe(cssnano()) // 压缩 css
        .pipe(rename({
            extname: '.min.css'
        })) // 重命名
        .pipe(gulp.dest(paths.css.dest)); // 输出 css 到目标
    return paths.css.iswatch ? css.pipe(bs.reload({
        stream: true
    })) : css;
}

// 操作 javascript
const uglify = require('gulp-uglify');

function js() {
    let js = gulp.src(paths.js.src, {
            sourcemaps: true
        })
        .pipe(uglify()) // 压缩 javascript
        .pipe(rename({
            extname: '.min.js'
        })) // 重命名
        .pipe(gulp.dest(paths.js.dest)); // 输出 js 到目标
    return paths.js.iswatch ? js.pipe(bs.reload({
        stream: true
    })) : js;
}

// 操作 html
const htmlmin = require('gulp-htmlmin');

function html() {
    let html = gulp.src(paths.html.src)
        .pipe(htmlmin({
            collapseWhitespace: true,
            collapseBooleanAttributes: true,
            removeAttributeQuotes: true,
            removeComments: true,
            removeEmptyAttributes: true,
            removeScriptTypeAttributes: true,
            removeStyleLinkTypeAttributes: true,
        })) // 压缩 html
        .pipe(gulp.dest(paths.html.dest)); // 输出 html 到目标
    return paths.html.iswatch ? html.pipe(bs.reload({
        stream: true
    })) : html;
}

// 操作 image
function images() {
    let _images = gulp.src(paths.images.src, {
            since: gulp.lastRun(images)
        })
        .pipe(gulp.dest(paths.images.dest));
    return paths.images.iswatch ? _images.pipe(bs.reload({
        stream: true
    })) : _images;
}

// 操作 copy
function copy() {
    let copys = paths.copy;
    let task = null;
    for (let i = 0; i < copys.length; i++) {
        if (i === 0) {
            task = gulp.src(copys[i].src).pipe(gulp.dest(copys[i].dest));
        } else {
            gulp.src(copys[i].src).pipe(gulp.dest(copys[i].dest));
        }
    }
    return task;
}

// 获取本地 ip
function getIP() {
    const os = require('os');
    const osType = os.type(); //系统类型
    const ifaces = os.networkInterfaces(); //网络信息
    let ip = '127.0.0.1',
        wlan_ip = '127.0.0.1';
    if (osType === 'Windows_NT') {
        for (let dev in ifaces) {
            if (!ifaces.hasOwnProperty(dev)) {
                continue;
            }
            if (dev === 'WLAN') { // WLAN
                ifaces[dev].forEach(details => {
                    if (details.family === 'IPv4') {
                        wlan_ip = details.address;
                        return;
                    }
                });
            } else if (dev === '本地连接' || dev === '以太网') { // win7 的网络信息中显示为'本地连接'，win10 显示信息为'以太网'
                ifaces[dev].forEach(details => {
                    if (details.family === 'IPv4') {
                        ip = details.address;
                        return;
                    }
                });
            }
        }
    } else if (osType === 'Linux') {
        ip = ifaces.eth0[0].address;
    }
    return ip === '127.0.0.1' ? wlan_ip : ip;
}

/**
 * 字符串替换
 * @param {Object} path	路径
 * @param {Object} o	原字符
 * @param {Object} n	要替换为的字符
 */
function replace(path, o, n) {
    path = path.replace(paths.base_src + '/', paths.base_dest + '/').replace(paths.base_src + '\\', paths.base_dest +
        '\\');
    return path.replace(o, n);
}

// 以热部署模式运行 http://www.browsersync.cn/docs/api/
const bs = require('browser-sync');

function watch() {
    bs.init({
        server: { // 启动静态服务器，默认监听 3000 端口，
            baseDir: paths.base_dest,
        },
        files: [paths.css.dest, paths.js.dest, paths.html.dest, paths.images.dest], // 设置监听的文件，默认是 gulpfile.js 文件所在目录
        ghostMode: { // 在不同浏览器上镜像点击、滚动，所有浏览器都会同步
            clicks: true,
            forms: true,
            scroll: false
        },
        logLevel: "info",
        logPrefix: "d7c", // 更改控制台日志前缀
        browser: ["chrome"], // 设置监听时打开的浏览器
        notify: false,
        host: getIP(),
        port: 8080, // 设置服务器监听的端口号
        ui: {
            port: 65534
        },
        open: 'external',
        startPath: '/index.html', // 项目启动时打开的页面路径
    }, function(err, bs) {
        if (err === null) {
            console.log("bs.active:" + bs.active)
            console.log("服务启动成功......");
        } else {
            console.log(err);
        }
    });

    // 监控目录
    if (paths.css.iswatch) {
        gulp.watch(paths.css.src, {
            ignoreInitial: false,
            delay: 500 // 文件第一次修改之后要等待 500 毫秒才执行关联的任务
        }, css).on('unlink', path => {
            let endsWith = path.endsWith('.css');
            let start_ = path.indexOf('_');
            if (start_ == -1 || endsWith) { // 不是以 _ 开头或者以 .css 结尾
                path = replace(path, '', '').replace('.css', '').replace('.less', '') + '.min.css';
                del(path);
            }
        });
    }
    if (paths.js.iswatch) {
        gulp.watch(paths.js.src, {
            ignoreInitial: false,
            delay: 500
        }, js).on('unlink', path => del(replace(path, '.js', '.min.js')));
    }
    if (paths.html.iswatch) {
        gulp.watch(paths.html.src, {
            ignoreInitial: false,
            delay: 500
        }, html).on('unlink', path => del(replace(path, '', '')));
    }
    if (paths.images.iswatch) {
        gulp.watch(paths.images.src, {
            ignoreInitial: false,
            delay: 500
        }, images).on('unlink', path => del(replace(path, '', '')));
    }
}


// 外部命令
exports.clean = clean;
exports.css = css;
exports.js = js;
exports.html = html;
exports.images = images;
exports.copy = copy;

const compile = gulp.series(clean, gulp.parallel(css, js, html, images, copy));
exports.compile = compile;

const build = gulp.series(clean, gulp.parallel(css, js, html, images, copy), watch);
exports.build = build;
// 使用 gulp 命令调用默认任务
exports.default = build;
