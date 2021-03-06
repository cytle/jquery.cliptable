'use strict';

window.cliptable = function cliptable (table, options) {

  if (!this || this === window) {
    return new cliptable(table, options);
  }

  this.options = options = options || {};

  var self = this;

  this.table = table;

  if (options.trOverflowCallback) {
    var trOverflowCallback = options.trOverflowCallback;

    options.trOverflowCallback = function () {

      var result = trOverflowCallback.apply(this, arguments);
      self.signInput(table, options);

      return result;

    };
  }

  if (options.tdOverflowCallback) {
    var tdOverflowCallback = options.tdOverflowCallback;

    options.tdOverflowCallback = function () {

      var result = tdOverflowCallback.apply(this, arguments);

      self.signInput(table, options);

      return result;
    };
  }

  // td打上标记
  this.signInput(table, options);

  this._bindEvents();
};



window.cliptable.prototype = {

  rowSign: 'row',
  colSign: 'col',
  nameSign: 'name',

  // 绑定监听
  _bindEvents: function () {

    var self = this;

    this
    .table
      .addEventListener('paste', function (e) {

        var values = self.getArrFromClipboardData(e.clipboardData);
        if (values && values.length > 0) {
          var td = e.target.closest('table tr td'),
              startRowN,
              startColN;

          if (td) {

            startRowN = td.dataset[self.rowSign];
            startColN = td.dataset[self.colSign];

            if (startRowN && startColN) {
              self.options.startRowN = parseInt(startRowN);
              self.options.startColN = parseInt(startColN);
            } else {
              self.options.startRowN = 0;
              self.options.startColN = 0;
            }


          }

          self.pasteValue(self.table, values, self.options);

        }

        if (e.preventDefault) {
          e.stopPropagation();
          e.preventDefault();
        }
      }, false);

  },

  // 从clipboardData 获取数据
  getArrFromClipboardData: function (clipboardData) {
    var values ;

    if (clipboardData && clipboardData.getData) {


      if (/text\/html/.test(clipboardData.types)) {
        values = clipboardData.getData('text/html');

        values = this.htmlTableToArr(values, this.options);

      }
      else if (/text\/plain/.test(clipboardData.types)) {
        values = clipboardData.getData('text/plain');

        values = this.textToArr(values, this.options);

      }
      else {
        values = [];
      }

    }
    return values;
  },

  htmlTableToArr: function (table) {
    var div = document.createElement('div'), trs, tds, values = [], rowValues = [];

    div.innerHTML = table;

    table = div.querySelector('table');

    trs = table.querySelectorAll('tr');

    for (var i = 0, l = trs.length ; i < l; i++) {


      tds = trs[i].querySelectorAll('td');

      rowValues = [];

      for (var j = 0, m = tds.length; j < m; j++) {
        rowValues.push(tds[j].innerHTML);
      }

      values.push(rowValues);

    }

    return values;
  },


  /**
   * 将excel有\t \n 的文本转为数组
   *
   * @param text string
   * @return array
   */
  textToArr: function (text) {

    // .replace(/[^ \.\d\t\n\r]| /g,'') 限定数字
    var textArr = text.split("\n");

    for(var nRow = 0, l = textArr.length; nRow < l; nRow++) {

      textArr[nRow] = textArr[nRow].split("\t");
    }

    return textArr;
  },

  /**
   * 给table中的input做上data标记
   *
   * @param tbody dom
   * @param options object 配置
   * @return dom
   */
  signInput: function (table, options) {
    options = options || {};

    var rowSign = options.rowSign || this.rowSign || 'row',
        colSign = options.colSign || this.colSign || 'col',
        trSelector = options.trSelector || ':scope > tr',
        tdSelector = options.tdSelector || ':scope > td',
        trs, tds, rowN, colN;

    if (! table.tBodies || table.tBodies.length === 0) {
      return false;
    }

    trs = table.tBodies[0].querySelectorAll(trSelector);

    for (rowN = trs.length - 1; rowN >= 0; rowN--) {

      tds = trs[rowN].querySelectorAll(tdSelector);


      for (colN = tds.length - 1; colN >= 0; colN--) {
        var itemData = tds[colN].dataset;
        itemData[rowSign] = rowN;
        itemData[colSign] = colN;
      }
    }


  },

  getDatas: function (table, options) {
    options = options || {};

    var nameSign = options.nameSign || this.nameSign || 'name',
        trSelector = options.trSelector || ':scope > tr',
        tdSelector = options.tdSelector || ':scope > td',
        inputSelector = options.inputSelector = options.inputSelector || 'input',
        trs, tds, rowN, colN, datas = [], itemData, td, input, value;

    if (! table.tBodies || table.tBodies.length === 0) {
      return false;
    }

    trs = table.tBodies[0].querySelectorAll(trSelector);

    for (rowN = trs.length - 1; rowN >= 0; rowN--) {

      tds = trs[rowN].querySelectorAll(tdSelector);


      for (colN = tds.length - 1; colN >= 0; colN--) {
        td = tds[colN];

        itemData = td.dataset;

        input = td.querySelector(inputSelector);

        if (! input) {
          value = null;
        } else {
          value = td.querySelector(inputSelector).value || null;
        }


        if (! datas[rowN]) {
          datas[rowN] = {};
        }

        if (itemData[nameSign]) {
          datas[rowN][itemData[nameSign]] = value;
        } else {
          datas[rowN][colN] = value;
        }

      }
    }

    return datas;
  },


  /**
   * 给表中数据赋值
   *
   * @param tbody dom
   * @param values array 值数组
   * @param options object 配置
   * @return dom
   */
  pasteValue: function (table, values, options) {
    options = options || {};

    var i, j, l, rowValues, value, tBody, trs, tds, rowL, rowN, colN, canPasteRowNum, canPasteColNum,
        startRowN = options.startRowN = options.startRowN || 0,
        startColN = options.startColN = options.startColN || 0,
        inputSelector = options.inputSelector = options.inputSelector || 'input',
        trSelector = options.trSelector = options.trSelector || ':scope > tr',
        tdSelector = options.tdSelector = options.tdSelector || ':scope > td',
        trOverflowCallbackResult,
        tdOverflowCallbackResult,
        trOverflowCallback = options.trOverflowCallback = options.trOverflowCallback || null, // 行溢出，数据数大于行数情况下执行
        tdOverflowCallback = options.tdOverflowCallback = options.tdOverflowCallback || null; // 列溢出，数据数大于列数情况下执行

    if (! table.tBodies || table.tBodies.length === 0) {
      return false;
    }
    tBody = table.tBodies[0];

    trs = tBody.querySelectorAll(trSelector);

    canPasteRowNum = trs.length - startRowN; // 可以粘贴的行数

    for (i = 0, l = values.length; i < l; i++) {

      rowValues = values[i];
      rowN = i + startRowN;

      // 当数据大于行数时
      if (i >= canPasteRowNum) {

        // 没有回调直接跳出循环
        if (! trOverflowCallback) {
          break;
        }

        // 执行行溢出回调，如果新增了一行需要返回true，没有则返回false，新增行必须加入到trs中
        trOverflowCallbackResult = trOverflowCallback.call(this, {
          values: values, // 所有值
          row: rowValues, // 当前行的数据
          table: table,   // 操作表格
          tBody: tBody,   // 操作tbody
          trs: trs,       // 获取到的所有行
          rowN: rowN,     // 当前所在行数
          i: i            // 当前values循环下标
        }, options);

        if (! trOverflowCallbackResult) {
          break;
        }

        // 重新获取trs
        trs = tBody.querySelectorAll(trSelector);

        if (! trs[rowN]) {
          break;
        }

        canPasteRowNum = trs.length - startRowN;

      }


      tds = trs[rowN].querySelectorAll(tdSelector);

      canPasteColNum = tds.length - startColN; // 当前行可以粘贴列数

      for (j = 0, rowL = rowValues.length; j < rowL; j++) {

        value = rowValues[j];
        colN = j + startColN;

        // 当数据大于列数时
        if (j >= canPasteColNum) {

          // 没有回调直接跳出循环
          if (! tdOverflowCallback) {
            break;
          }

          // 执行列溢出回调，如果新增了一td需要返回true，没有则返回false，新增td必须加入到tds中
          tdOverflowCallbackResult = tdOverflowCallback.call(this, {
            values: values, // 所有值
            row: rowValues, // 当前行的数据
            value: value,   // 当前值
            table: table,   // 操作表格
            tBody: tBody,   // 操作tbody
            trs: trs,       // 获取到的所有行
            tr: trs[rowN],  // 当前行
            tds: tds,       // 获取到的所有列
            rowN: rowN,     // 当前所在行数
            colN: colN,     // 当前所在行数
            i: i            // 当前values循环下标
          }, options);

          if (! tdOverflowCallbackResult) {
            break;
          }

          // 重新获取tds
          tds = trs[rowN].querySelectorAll(tdSelector);

          if (! tds[colN]) {
            break;
          }

          canPasteColNum = tds.length - startColN;

        }

        tds[colN].querySelector(inputSelector).value = value;

      }
    }


  },


};



