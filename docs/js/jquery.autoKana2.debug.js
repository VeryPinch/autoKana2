﻿// Copyright (c) 2016 Very.Pinch (very.pinch@gmail.com)
//
// Based on the autoKana library created by:
// Copyright (c) 2013 Keith Perhac @ DelfiNet (http://delfi-net.com)
//
// Released under the MIT license
// http://opensource.org/licenses/mit-license.php
//
(function( $ ){
  $.fn.autoKana2 = function(kanjiElement, kanaElement, options ) {

    // オプション設定
    var settings = $.extend( {
      "katakana"         : false,
    }, options);

    // キーボードを１タイプで入力できるJIS X0208の文字を対象とする
    var ruby_pattern = new RegExp("[^　ぁ-ゖァ-ヶＡ-Ｚａ-ｚ０-９｀〜！＠＃＄％＾＆＊（）＿ー＝＋｛「｝」｜；：’”＜、。＞・？／]", "g");
    // 英数記号削除用
    var check_pattern = new RegExp("[^　ァ-ヶー]", "g");
    // 末尾のｎチェック用(ｎｎ自動保管対策)
    var n_pattern = new RegExp("[ｎＮnN]", "g");
    // 入力途中のｍチェック用(MS-IME対策)
    var m_pattern = new RegExp("[^ｍＭmM]", "g");

    var elKanji = $(kanjiElement);
    elKanji.data("notSupport", "0");
    var elKana = $(kanaElement);
    
    var lastRubyStr = "";
    var beforeCommitStr = "";
    var orgText = "";
    var lastOrgInput = "";
    var msimeFlag = false;
    var defaultText = "";
    var spCaptured = false;
    var lastText = "";
    var selectText = "";
    var ff_msimeFlag = false;
    var nowEvent = "";

    var ua = navigator.userAgent.toLowerCase();
    var ver = navigator.appVersion.toLowerCase();
 
    // IEとEdgeはIME確定の挙動が変なので個別に対応する
    var isMSIE = (ua.indexOf("msie") > -1) && (ua.indexOf("opera") == -1);
    var isIE11 = (ua.indexOf("trident/7") > -1);
    var isIE = isMSIE || isIE11;
    var isEdge = (ua.indexOf('edge') > -1);
    var isFirefox = (ua.indexOf('firefox') > -1);
    var isSafari = (ua.indexOf('safari') > -1) && (ua.indexOf('chrome') == -1);
    var isiPhone = (ua.indexOf('iphone') > -1);
    var isiPad = (ua.indexOf('ipad') > -1);
    var isiOS = isiPhone || isiPad;
    var isAndroid = (ua.indexOf('android') > -1);

    var isOpera = (ua.indexOf('Opera') > -1);;
    var isOpera42 = false;
    if ((ua.indexOf("chrome") > -1) && (ua.indexOf("opr") > -1)){
      isOpera = true;
      var st = ua.indexOf("opr");
      if (ua.substr(st + 4).indexOf("42.0") > -1){
        isOpera42 = true;
      }
    }
    (ua.indexOf('Opera') > -1);
    // Chromeの55.0.xはcompositionupdateの挙動が変なので個別対応とする
    // 次のバージョンでは元に戻る事を期待して暫定対応としてバージョン決め打ちにする
    var isChrome = false;
    var isChrome55 = false;
    if ((ua.indexOf("chrome") > -1) && (ua.indexOf("opr") == -1)){
      isChrome = true;
      var st = ua.indexOf("chrome");
      var ed = ua.indexOf(" ", st);
      if ((ua.substring(st + 7, ed).indexOf("55.0") > -1) || (ua.substring(st + 7, ed).indexOf("56.0") > -1)){
        isChrome55 = true;
      }
    }
    var isNintendo = (ua.indexOf("mobile nintendobrowser") > -1);

    elKanji.on("keyup", function(e){
      if (e.keyCode === 8){
        spCaptured = false;
        var nowText = elKanji.val();
        if (nowText.length === 0){
          defaultText = "";
        }else{
          if (nowText.substr(nowText.length - 1) === "　")  spCaptured = true;
        }
      }
    });

    elKanji.on("focus", function(){
      elKanji.data("notSupport", "0");
      defaultText = elKanji.val();
      if (defaultText.length > 0 && defaultText.substr(defaultText.length - 1) === "　") spCaptured = true;
    });

    elKanji.on("blur", function(){
      if (elKanji.data("notSupport") === "1"){
        alert("正しくルビを取得出来無かった可能性が有ります。");
      }
    });
      
    elKanji.on("compositionstart", function(e){
      $("#debug").val($("#debug").val() + "\n\n" + "compositionstart");
      $("#debug").val($("#debug").val() + "\n" + "e.originalEvent.data:'" + e.originalEvent.data + "'");
      $("#debug").val($("#debug").val() + "\n" + "elKanji.val():'" + elKanji.val() + "'");
      $("#debug").val($("#debug").val() + "\n" + "beforeCommitStr:'" + beforeCommitStr + "'");
      $("#debug").val($("#debug").val() + "\n" + "elKanji[0].selectionStart:'" + elKanji[0].selectionStart + "'");
      $("#debug").val($("#debug").val() + "\n" + "elKanji[0].selectionEnd:'" + elKanji[0].selectionEnd + "'");
      nowEvent = "start";
      lastRubyStr = "";
      selectText = "";
      orgText = elKanji.val();
      // MS-IME対策(IME未確定状態でクリックするとcompositionendイベントが発生する)
      if (isIE || isEdge || isFirefox){
      	selectText = elKanji.val().slice(elKanji[0].selectionStart, elKanji[0].selectionEnd);
      $("#debug").val($("#debug").val() + "\n" + "selectText:'" + selectText + "'");
      	if (selectText.length > 0){
      	  orgText = orgText.slice(0, elKanji[0].selectionStart) + orgText.slice(elKanji[0].selectionEnd, orgText.length);
      	  if (isFirefox && beforeCommitStr.length > 0 && beforeCommitStr === e.originalEvent.data){
      	    ff_msimeFlag = true;
      	  }
      $("#debug").val($("#debug").val() + "\n" + "orgText:'" + orgText + "'");
        }else{
          if (beforeCommitStr.length > 0 && beforeCommitStr === e.originalEvent.data){
            $("#debug").val($("#debug").val() + "\n" + "クリック対策");
            var ruby = elKana.val();
            elKana.val(ruby.substr(0, ruby.length - beforeCommitStr.length));
            lastRubyStr = e.originalEvent.data;
            msimeFlag = true;
          }
        }
      }
      beforeCommitStr = "";
      lastText = "";
      if (window.getSelection){
        if (elKanji[0].selectionStart < elKanji[0].selectionEnd){
          if (orgText.length > 0 && orgText.substr(elKanji[0].selectionStart - 1, 1) === "　") spCaptured = true;
        }
      }
      if (isChrome55 || isOpera42){
        if ((elKanji[0].selectionStart < elKanji[0].selectionEnd) || elKanji[0].selectionEnd < orgText.length){
          lastText = orgText.substr(elKanji[0].selectionEnd);
          orgText = orgText.substr(0, elKanji[0].selectionStart);
        }
      }
      if (!spCaptured && (isChrome || isOpera || isSafari || isNintendo)){
        // 全角SPの入力でcompositionstartイベントが発生しないブラウザは、ここで救済する
        for(var i = orgText.length - 1; i > -1; i--){
          var lastChar = orgText.substr(i, 1);
          if (lastChar === "　"){
            elKana.val(elKana.val() + lastChar);
          } else {
            break;
          }
      	}
      }
    });
    
    elKanji.on("compositionupdate", function(e){
      $("#debug").val($("#debug").val() + "\n\n" + "compositionupdate");
      $("#debug").val($("#debug").val() + "\n" + "e.originalEvent.data:'" + e.originalEvent.data + "'");
      $("#debug").val($("#debug").val() + "\n" + "elKanji.val():'" + elKanji.val() + "'");
      setTimeout(function(){
      $("#debug").val($("#debug").val() + "\n" + "elKanji.val():'" + elKanji.val() + "'");
      }, 0);
      nowEvent = "update";
      var orgInput = e.originalEvent.data;
      var rubyStr = orgInput.toWideCase().replace(ruby_pattern, ""); // 半角カナ入力を考慮して全角に揃える
      var ieSaveFlag = false;
      if (orgInput.toWideCase().length === rubyStr.length){
        // ルビ取得対象外の文字が混じってない場合
        spCaptured = false;
        // 全角片仮名に変換して記号を取り除く
        var lastRubyCheckStr = lastRubyStr.toWideCase().toKatakanaCase().replace(check_pattern, "");
        var rubyCheckStr = rubyStr.toWideCase().toKatakanaCase().replace(check_pattern, "");

        if (lastRubyCheckStr.length > 0 && rubyCheckStr.length > 0 && 
            lastRubyStr.toWideCase().toKatakanaCase() === rubyStr.toWideCase().toKatakanaCase()){
          // 平仮名←→片仮名変換は無視する
          return;
        }
        
        if (isChrome55 || isOpera42){
          // Chrome 55.0.x はcompositionupdateのイベント引数で入力文字が1文字づつしか取得出来ないので
          // setTimeoutで現在入力中のテキストを取得して補完する
          setTimeout(function(){
            var nowText = elKanji.val();
            if (lastText.length > 0){
              nowText = nowText.substr(0, nowText.length - lastText.length);
            }
            if (nowText.substr(0, orgText.length) === orgText && nowText.substr(nowText.length - 1) === rubyStr) {
              rubyStr = nowText.substr(orgText.length, nowText.length);
              rubyCheckStr = rubyStr.toWideCase().toKatakanaCase().replace(check_pattern, "");
            }

            if (lastRubyCheckStr.length > 0 && rubyStr.length > 0 && rubyCheckStr.length === 0){
              // かな→英数字記号変換は無視する
              return;
            }

            if (rubyStr.length > 0){
              lastRubyStr = rubyStr;
            }else{
              lastRubyStr = lastRubyStr.substr(0, lastRubyStr.length -1);
            }
          }, 0);
        }else{
        $("#debug").val($("#debug").val() + "\n" + "lastRubyStr:'" + lastRubyStr + "'");
        $("#debug").val($("#debug").val() + "\n" + "rubyStr:'" + rubyStr + "'");
          if (ff_msimeFlag){
            if (selectText !== rubyStr){
              ff_msimeFlag = false;
            }
          }
          // IEでは変換キーを押下後にEnter以外でIMEが確定した場合、compositionendイベントが発火しないので救済する
          if (isIE || isEdge){
            var nowText = elKanji.val();
        $("#debug").val($("#debug").val() + "\n" + "orgText:'" + orgText + "'");
        $("#debug").val($("#debug").val() + "\n" + "nowText:'" + nowText + "'");
            if (nowText.substr(0, orgText.length) === orgText){
              var nowInput = nowText.substr(orgText.length, nowText.length - orgText.length);
              if (nowInput !== orgInput){
      $("#debug").val($("#debug").val() + "\n" + "Enter以外の確定対策");
                // 現在のテキストから入力開始前のテキストを削除した結果が現在入力中のテキストと一致しない場合は確定されたと判定
                addRuby(lastRubyStr);
                orgText = elKanji.val().substr(0, elKanji.val().length -1);
                msimeFlag = false;
                ieSaveFlag = true;
              }
            }
          }

          if (!ieSaveFlag && lastRubyCheckStr.length > 0 && rubyStr.length > 0 && rubyCheckStr.length === 0){
            // かな→英数字記号変換は無視する
            return;
          }

      $("#debug").val($("#debug").val() + "\n" + "ff_msimeFlag:'" + ff_msimeFlag + "'");

          if (ff_msimeFlag){
            lastRubyStr = "";
          }else{
            if (rubyStr.length > 0){
              lastRubyStr = rubyStr;
            }
          }
          ff_msimeFlag = false;
        }

      }else{
        // MS-IMEの場合、IME変換後にBSキーで変換した文字を削除出来るので正しくルビを取得出来ない
        if (lastOrgInput.length - orgInput.length === 1){
          if (lastOrgInput.substr(0, orgInput.length) === orgInput){
            elKanji.data("notSupport", "1");
          }
        }
      }
      lastOrgInput = orgInput;

      if (ieSaveFlag){
        checkPatternM(orgInput, lastRubyStr);
      }
      
    });
    
    elKanji.on("compositionend", function(e){
      $("#debug").val($("#debug").val() + "\n\n" + "compositionend");
      $("#debug").val($("#debug").val() + "\n" + "e.originalEvent.data:'" + e.originalEvent.data + "'");
      $("#debug").val($("#debug").val() + "\n" + "elKanji.val():'" + elKanji.val() + "'");
      
      nowEvent = "end";
      var orgInput = e.originalEvent.data;
      var nowText = elKanji.val();
      beforeCommitStr = "";

      $("#debug").val($("#debug").val() + "\n" + "isiPhone:'" + isiPhone + "'");
      $("#debug").val($("#debug").val() + "\n" + "isiPad:'" + isiPad + "'");
      $("#debug").val($("#debug").val() + "\n" + "isiOS:'" + isiOS + "'");


      if (isiOS || isAndroid){
        // iOSで分節変換をした場合はupdateイベントが割り込んで来る
        setTimeout(function(){
      $("#debug").val($("#debug").val() + "\n" + "nowEvent:'" + nowEvent + "'");
      $("#debug").val($("#debug").val() + "\n" + "elKanji[0].selectionStart:'" + elKanji[0].selectionStart + "'");
      $("#debug").val($("#debug").val() + "\n" + "elKanji[0].selectionEnd:'" + elKanji[0].selectionEnd + "'");
          if (nowEvent === "update"){
            var nowStr = elKanji.val();
            var extraStr = nowStr.substr(nowStr.length - lastOrgInput.length, lastOrgInput.length);
            extraStr = settings.katakana ? extraStr.toKatakanaCase() : extraStr.toHiraganaCase();
            var nowRuby = elKana.val();
      $("#debug").val($("#debug").val() + "\n" + "nowStr:'" + nowStr + "'");
      $("#debug").val($("#debug").val() + "\n" + "lastOrgInput:'" + lastOrgInput + "'");
      $("#debug").val($("#debug").val() + "\n" + "extraStr:'" + extraStr + "'");
      $("#debug").val($("#debug").val() + "\n" + "nowRuby:'" + nowRuby + "'");
      $("#debug").val($("#debug").val() + "\n" + "nowRuby.substr(nowRuby.length - extraStr.length):'" + nowRuby.substr(nowRuby.length - extraStr.length) + "'");
            if (nowRuby.substr(nowRuby.length - extraStr.length) === extraStr){
              elKana.val(nowRuby.substr(0, nowRuby.length - extraStr.length));
            }
          }
        }, 20);
      }

      
      // 文字列を入力し確定前にBSキーで1文字以上を削除した状態で、変換せずに確定した場合
      // IE とMS-IMEの組み合わせだとe.originalEvent.dataには何も入って来ないので救済する
      var ie_msime = false;
      if ((isIE || isEdge) && orgInput.length === 0 && lastRubyStr.length > 0){
        var targetText = nowText.substr(orgText.length);
        if (targetText.substr(targetText.length - lastRubyStr.length) === lastRubyStr){
          ie_msime = true;
        }
      }

      if (orgInput.length > 0 || msimeFlag || ie_msime){
        addRuby(lastRubyStr);
        beforeCommitStr = lastRubyStr;
        msimeFlag = false;
        checkPatternM(orgInput, lastRubyStr);
        lastRubyStr = ""; // Safari 5.1.7は全角SP入力でcompositionendイベントのみ発生するのでクリアしておく
      }

      if (isIE || isEdge){
        // IEとEdgeは全角SPの入力でcompositionupdateが発生しないので、ここで救済する
        if (orgText.length < nowText.length){
          if (nowText.substr(0, orgText.length) === orgText){
            var work = nowText.substr(orgText.length, nowText.length - orgText.length);
            if (work === "　"){
              elKana.val(elKana.val() + work);
            }
          }
        }
      }
    });

    // ルビを追加する
    function addRuby(target){
    	var value = settings.katakana ? target.toKatakanaCase() : target.toHiraganaCase();
        elKana.val(elKana.val() + appendN(value)); 
    }

    // 文字列の最後がｎで終わってる場合、んに変換する
    function appendN(target){
      var result = target;
      if (target.toKatakanaCase().replace(check_pattern, "").replace("　", "").length > 0){
        var lastStr = target.substring(target.length - 1);
        if (lastStr.replace(n_pattern, "").length === 0){
          var testStr = target.substr(0, target.length - 1);
          result = testStr;
          result += settings.katakana ? "ン" : "ん";
        }
      }
      return result;
    }
    
    // MS-IMEで入力途中にタイプミスでmを入力した後に変換するとmがnとして扱われるためエラーフラグを立てる
    // (例)かせmじき → 河川敷
    function checkPatternM(kanji, ruby){
       if (kanji.replace(m_pattern, "").length === 0 && ruby.replace(m_pattern, "").length > 0){
        elKanji.data("notSupport", "1");
      }
    }

  };
})( jQuery );

//　平仮名を片仮名へ変換する
String.prototype.toKatakanaCase = function(){
  return this.replace(/[\u3041-\u3096]/g, function(match) {
    var chr = match.charCodeAt(0) + 0x60;
    return String.fromCharCode(chr);
  });
};

//　片仮名を平仮名へ変換する
String.prototype.toHiraganaCase = function(){
  return this.replace(/[\u30a1-\u30f6]/g, function(match) {
    var chr = match.charCodeAt(0) - 0x60;
    return String.fromCharCode(chr);
  });
};


// JIS X0201の文字をJIS X0208に変換する
String.prototype.toWideCase = function(){
  var i, f, c, c2, a = [], m = String.prototype.toWideCase.MAPPING;
  for(i = 0, f = this.length; i < f;){
    c = this.charCodeAt(i++);
    c2 = this.charCodeAt(i);
    switch (true){
        case ((0x21 <= c && c <= 0x7E) && !(c == 0x22 || c == 0x27 || c == 0x5C)):
          // 英数字および一部の記号('"\は除外)
          a.push((c + 0xFEE0));
          break;
        case (c == 0xFF73):
          if (c2 == 0xFF9E){
            // ｳﾞの場合
            a.push(0x30F4);
            i++;
            break;
          }
       case (0xFF76 <= c && c <= 0xFF86):
         if (c2 == 0xFF9E){
           // ｶ行からﾀ行の濁音の場合
           a.push(m[c] + 0x1);
           i++;
           break;
         }
       case (0xFF8A <= c && c <= 0xFF8E):
         if (c2 == 0xFF9E || c2 == 0xFF9F) {
           // ﾊ行の濁音、半濁音の場合
           a.push(m[c] + (c2 - 0xFF9D));
           i++;
           break;
         }
       case (c in m):
         // 上記以外の半角カタカナと一部の記号
         a.push(m[c]);
         break;
       default:
         // その他の文字
         a.push(c);
         break;
    }
  }
  return String.fromCharCode.apply(null, a);
};
String.prototype.toWideCase.MAPPING = {
  0x5C:0xFFE5,
  0x2D:0x2015,
  0x27:0x2018,
  0x22:0x201C,
  0x20:0x3000,
  0xFF64:0x3001,
  0xFF61:0x3002,
  0xFF62:0x300C,
  0xFF63:0x300D,
  0xFF9E:0x309B,
  0xFF9F:0x309C,
  0xFF67:0x30A1,
  0xFF71:0x30A2,
  0xFF68:0x30A3,
  0xFF72:0x30A4,
  0xFF69:0x30A5,
  0xFF73:0x30A6,
  0xFF6A:0x30A7,
  0xFF74:0x30A8,
  0xFF6B:0x30A9,
  0xFF75:0x30AA,
  0xFF76:0x30AB,
  0xFF77:0x30AD,
  0xFF78:0x30AF,
  0xFF79:0x30B1,
  0xFF7A:0x30B3,
  0xFF7B:0x30B5,
  0xFF7C:0x30B7,
  0xFF7D:0x30B9,
  0xFF7E:0x30BB,
  0xFF7F:0x30BD,
  0xFF80:0x30BF,
  0xFF81:0x30C1,
  0xFF6F:0x30C3,
  0xFF82:0x30C4,
  0xFF83:0x30C6,
  0xFF84:0x30C8,
  0xFF85:0x30CA,
  0xFF86:0x30CB,
  0xFF87:0x30CC,
  0xFF88:0x30CD,
  0xFF89:0x30CE,
  0xFF8A:0x30CF,
  0xFF8B:0x30D2,
  0xFF8C:0x30D5,
  0xFF8D:0x30D8,
  0xFF8E:0x30DB,
  0xFF8F:0x30DE,
  0xFF90:0x30DF,
  0xFF91:0x30E0,
  0xFF92:0x30E1,
  0xFF93:0x30E2,
  0xFF6C:0x30E3,
  0xFF94:0x30E4,
  0xFF6D:0x30E5,
  0xFF95:0x30E6,
  0xFF6E:0x30E7,
  0xFF96:0x30E8,
  0xFF97:0x30E9,
  0xFF98:0x30EA,
  0xFF99:0x30EB,
  0xFF9A:0x30EC,
  0xFF9B:0x30ED,
  0xFF9C:0x30EF,
  0xFF66:0x30F2,
  0xFF9D:0x30F3,
  0xFF65:0x30FB,
  0xFF70:0x30FC
};