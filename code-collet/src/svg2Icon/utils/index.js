"use strict";
exports.__esModule = true;
exports.underlineToHump = void 0;
/*
* 下划线转换驼峰
*/
function underlineToHump(str) {
    var upcase = str.replace(/(\w?)(?:[_-]+(\w))/g, function ($0, $1, $2) {
        return $1 + $2.toUpperCase();
    });
    // 首字母大写
    return upcase[0].toUpperCase() + upcase.slice(1);
}
exports.underlineToHump = underlineToHump;
