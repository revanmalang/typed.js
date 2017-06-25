import _ from "lodash";
import Optionals from './optionals.js'

export default class Typed {

  constructor(elementId, options){
    var self = this;
    // chosen element to manipulate text
    this.el = document.getElementById(elementId);
    // div containing strings
    this.stringsElement = document.getElementById(options.stringsElement);
    // Set remaining options
    new Optionals(this, options);
    // Insert cursor
    if (this.showCursor === true) {
      this.cursor = document.createElement('span');
      this.cursor.className = 'typed-cursor';
      this.cursor.innerHTML = this.cursorChar;
      this.el.parentNode && this.el.parentNode.insertBefore(this.cursor, this.el.nextSibling);
    }
    if (this.stringsElement) {
      this.strings = [];
      this.stringsElement.style.display = 'none';
      var strings = Array.prototype.slice.apply(this.stringsElement.children);
      for (let s of strings) {
        self.strings.push(s.innerHTML);
      }
    }
    this.begin();
  }

  begin() {
    // begin the loop w/ first current string (global self.strings)
    // current string will be passed as an argument each time after this
    var self = this;
    self.timeout = setTimeout(function() {
      for (let i in self.strings) {
        self.sequence[i] = i;
      }

      // shuffle the array if true
      if (self.shuffle) {
        self.sequence = self.shuffleArray(self.sequence);
      }

      var elContent;
      if (self.isInput) {
        elContent = self.el.value;
      } else if (self.contentType === 'html') {
        elContent = self.el.innerHTML;
      } else {
        elContent = self.el.textContent;
      }
      // Start typing
      // Check if there is some text in the element, if yes start by backspacing the default message
      if (elContent.length == 0) {
        self.typewrite(self.strings[self.sequence[self.arrayPos]], self.strPos);
      } else {
        self.backspace(elContent, elContent.length);
      }
    }, self.startDelay);
  }

  // pass current string state to each function, types 1 char per call
  typewrite(curString, curStrPos) {
    // exit when stopped
    if (this.stop === true) {
      return;
    }

    if (this.fadeOut && this.el.classList.contains(this.fadeOutClass)) {
      this.el.classList.remove(this.fadeOutClass);
      this.cursor.classList.remove(this.fadeOutClass);
    }

    // varying values for setTimeout during typing
    // can't be global since number changes each time loop is executed
    var humanize = Math.round(Math.random() * (100 - 30)) + this.typeSpeed;
    var self = this;

    // ------------- optional ------------- //
    // backpaces a certain string faster
    // ------------------------------------ //
    // if (self.arrayPos == 1){
    //  self.backDelay = 50;
    // }
    // else{ self.backDelay = 500; }

    // contain typing function in a timeout humanize'd delay
    self.timeout = setTimeout(function() {
      // check for an escape character before a pause value
      // format: \^\d+ .. eg: ^1000 .. should be able to print the ^ too using ^^
      // single ^ are removed from string
      var charPause = 0;
      var substr = curString.substr(curStrPos);
      if (substr.charAt(0) === '^') {
        var skip = 1; // skip atleast 1
        if (/^\^\d+/.test(substr)) {
          substr = /\d+/.exec(substr)[0];
          skip += substr.length;
          charPause = parseInt(substr);
        }

        // strip out the escape character and pause value so they're not printed
        curString = curString.substring(0, curStrPos) + curString.substring(curStrPos + skip);
      }

      curStrPos = self.typeHtmlChars(curString, curStrPos);

      // timeout for any pause after a character
      self.timeout = setTimeout(function() {
        if (curStrPos === curString.length) {
          // fires callback function
          self.options.onStringTyped(self.arrayPos);

          // is this the final string
          if (self.arrayPos === self.strings.length - 1) {
            // animation that occurs on the last typed string
            self.options.callback();

            self.curLoop++;

            // quit if we wont loop back
            if (self.loop === false || self.curLoop === self.loopCount)
              return;
          }

          self.timeout = setTimeout(function() {
            self.backspace(curString, curStrPos);
          }, self.backDelay);

        } else {

          /* call before functions if applicable */
          if (curStrPos === 0) {
            self.options.preStringTyped(self.arrayPos);
          }

          // start typing each new char into existing string
          // curString: arg, self.el.html: original text inside element
          var nextString = curString.substr(0, curStrPos + 1);
          if (self.attr) {
            self.el.setAttribute(self.attr, nextString);
          } else {
            if (self.isInput) {
              self.el.value = nextString;
            } else if (self.contentType === 'html') {
              self.el.innerHTML = nextString;
            } else {
              self.el.textContent = nextString;
            }
          }

          // add characters one by one
          curStrPos++;
          // loop the function
          self.typewrite(curString, curStrPos);
        }
        // end of character pause
      }, charPause);

      // humanized value for typing
    }, humanize);

  }

  backspace(curString, curStrPos) {
    var self = this;
    // exit when stopped
    if (this.stop === true) {
      return;
    }

    if (this.fadeOut){
      this.initFadeOut();
      return;
    }

    // varying values for setTimeout during typing
    // can't be global since number changes each time loop is executed
    var humanize = Math.round(Math.random() * (100 - 30)) + this.backSpeed;

    self.timeout = setTimeout(function() {

      // ----- this part is optional ----- //
      // check string array position
      // on the first string, only delete one word
      // the stopNum actually represents the amount of chars to
      // keep in the current string. In my case it's 14.
      // if (self.arrayPos === 0){
      //  self.stopNum = 14;
      // }
      // else {
      //  self.stopNum = 0;
      // }

      var newStopNum = curString.split('~')[1];
      if (newStopNum) {
        self.stopNum = parseInt(newStopNum);
      }
      else {
        self.stopNum = 0;
      }

      curStrPos = self.backSpaceHtmlChars(curString, curStrPos);

      // ----- continue important stuff ----- //
      // replace text with base text + typed characters
      var nextString = curString.substr(0, curStrPos);
      self.replaceText(nextString);

      // if the number (id of character in current string) is
      // less than the stop number, keep going
      if (curStrPos > self.stopNum) {
        // subtract characters one by one
        curStrPos--;
        // loop the function
        self.backspace(curString, curStrPos);
      }
      // if the stop number has been reached, increase
      // array position to next string
      else if (curStrPos <= self.stopNum) {
        self.arrayPos++;

        if (self.arrayPos === self.strings.length) {
          self.arrayPos = 0;

          // Shuffle sequence again
          if(self.shuffle) self.sequence = self.shuffleArray(self.sequence);

          self.begin();
        } else
          self.typewrite(self.strings[self.sequence[self.arrayPos]], curStrPos);
      }

      // humanized value for typing
    }, humanize);

  }

  typeHtmlChars(curString, curStrPos) {
    if (this.contentType !== 'html') return;
    // skip over html tags while typing
    var curChar = curString.substr(curStrPos).charAt(0);
    if (curChar === '<' || curChar === '&') {
      var tag = '';
      var endTag = '';
      if (curChar === '<') {
        endTag = '>'
      }
      else {
        endTag = ';'
      }
      while (curString.substr(curStrPos + 1).charAt(0) !== endTag) {
        tag += curString.substr(curStrPos).charAt(0);
        curStrPos++;
        if (curStrPos + 1 > curString.length) { break; }
      }
      curStrPos++;
    }
    return curStrPos;
  }

  backSpaceHtmlChars(curString, curStrPos) {
    if (this.contentType !== 'html') return;
    // skip over html tags while backspacing
    if (curString.substr(curStrPos).charAt(0) === '>') {
      var tag = '';
      while (curString.substr(curStrPos - 1).charAt(0) !== '<') {
        tag -= curString.substr(curStrPos).charAt(0);
        curStrPos--;
        if (curStrPos < 0) { break; }
      }
      curStrPos--;
      tag += '<';
    }
    return curStrPos;
  }

  // Adds a CSS class to fade out current string
  initFadeOut(){
    self = this;
    this.el.className += ' ' + this.fadeOutClass;
    this.cursor.className += ' ' + this.fadeOutClass;
    return setTimeout(function() {
      self.arrayPos++;
      self.replaceText('');

      // Resets current string if end of loop reached
      if(self.strings.length > self.arrayPos) {
        self.typewrite(self.strings[self.sequence[self.arrayPos]], 0);
      } else {
        self.typewrite(self.strings[0], 0);
        self.arrayPos = 0;
      }
    }, self.fadeOutDelay);
  }

  // Replaces current text in the HTML element
  replaceText(str) {
    if (this.attr) {
      this.el.setAttribute(this.attr, str);
    } else {
      if (this.isInput) {
        this.el.value = str;
      } else if (this.contentType === 'html') {
        this.el.innerHTML = str;
      } else {
        this.el.textContent = str;
      }
    }
  }

  // Shuffles the numbers in the given array.
  shuffleArray(array) {
    var tmp, current, top = array.length;
    if(top) while(--top) {
      current = Math.floor(Math.random() * (top + 1));
      tmp = array[current];
      array[current] = array[top];
      array[top] = tmp;
    }
    return array;
  }

  // Reset and rebuild the element
  reset() {
    var self = this;
    clearInterval(self.timeout);
    var id = this.el.getAttribute('id');
    this.el.textContent = '';
    if (typeof this.cursor !== 'undefined' && typeof this.cursor.parentNode !== 'undefined') {
      this.cursor.parentNode.removeChild(this.cursor);
    }
    this.strPos = 0;
    this.arrayPos = 0;
    this.curLoop = 0;
    // Send the callback
    this.options.resetCallback();
  }

}
