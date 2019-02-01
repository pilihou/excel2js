'use strict';

const Fs = require('fire-fs');
const Path = require('fire-path');

module.exports = {
    load() {
        console.log('excel2json package loaded');
    },

    unload() {
        console.log('excel2json package unload');
    },

    messages: {
        'open'() {
            Editor.Panel.open('excel2json');
        },

        'update-excel'(event) {
            let excelDir = Path.join(Editor.projectPath, 'excel');
            if (!Fs.existsSync(excelDir)) {
                Fs.mkdirSync(excelDir);
            }
            let excelArr = Fs.readdirSync(excelDir);
            if (event.reply) {
                event.reply(null, excelArr);
            }
        },

        'convert-json'(event, excelFileName) {
            if (Array.isArray(excelFileName)) {
                for (let i = 0; i < excelFileName.length; i++) {
                    this.convertJson(excelFileName[i]);
                }
            } else {
                this.convertJson(excelFileName);
            }
        },
    },

    convertJson(excelFileName) {
        //解析excel
        let xlsx = Editor.require('packages://excel2json/node_modules/xlsx');
        let excelName = Path.join(Editor.projectPath, 'excel', excelFileName);
        const workbook = xlsx.readFile(excelName);
        const sheetNames = workbook.SheetNames;
        const worksheet = workbook.Sheets[sheetNames[0]];
        const headers = {};
        const data = [];
        const keys = Object.keys(worksheet);
        keys.filter(k => k[0] !== '!')// 过滤以 ! 开头的 key
            .forEach(k => {// 遍历所有单元格
                let col = k.substring(0, 1);
                let row = parseInt(k.substring(1));
                let value = worksheet[k].v;
                if (row === 1) {
                    headers[col] = value;
                    return;
                }
                if (!data[row]) {
                    data[row] = {};
                }
                data[row][headers[col]] = value;
            });
        data.splice(0, 2);

        //转Array为text
        let jsonText = 'module.exports = [\n';
        for (let i = 0; i < data.length; i++) {
            jsonText += '\t{';
            for (let key in data[i]) {
                jsonText += `${key}:${data[i][key]}, `;
            }
            jsonText = jsonText.substr(0, jsonText.length - 2);
            jsonText += '},\n';
        }
        jsonText += '];';

        //写入js文件
        let jsonDir = Path.join(Editor.projectPath, 'assets', 'data');
        if (!Fs.existsSync(jsonDir)) {
            Fs.mkdirSync(jsonDir);
        }
        let excelFile = excelFileName.substr(0, excelFileName.lastIndexOf('.xlsx'));
        let url = `db://assets/data/${excelFile}.js`;
        if (Editor.assetdb.exists(url)) {
            Editor.assetdb.saveExists(url, jsonText);
        } else {
            Editor.assetdb.create(url, jsonText);
        }
        Editor.Ipc.sendToPanel('excel2json', 'convert-finish', excelFileName);
    }
};