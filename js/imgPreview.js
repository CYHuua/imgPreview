;(function (factory) {
    /* CommonJS module. */
    if (typeof module === "object" && typeof module.exports === "object") {
        module.exports = factory(window);
    /* AMD module. */
    } else if (typeof define === "function" && define.amd) {
        define(factory(window));
    /* Browser globals. */
    } else {
        factory(window);
    }
}(function(global, undefined) {
    /**
     * 参考veSlider, https://github.com/pwstrick/veSlider/tree/master
     */
    "use strict";
    
    var imgPreviewProtytype = imgPreview.prototype;
    var slice = [].slice;//强制转换成数组
    //默认参数
    var defaults = {
        targets: '',    //目标图片集容器
        curIndex: 0,    //初始图片索引
        auto: false,    //自动轮播
        easing: 'ease-in',  //缓动类型
        duration: 3000 //自动轮播间隔时间
    };
    
    //常量
    var CONST = {
        LEFT:'left',
        RIGHT:'right'
    }
    
    //绑定的事件 目前只适用于webkit内核浏览器
    var events = {start:'touchstart', move:'touchmove', end:'touchend', transition:'webkitTransitionEnd'};
    
    /**
     * 简单的数组合并
     */
    function extend(source, target) {
        for(var key in source) {
            if(source.hasOwnProperty(key))
                target[key] = source[key];
        }
        return target;
    }
    
    /**
     * 获取到祖先中最近的标签
     */
    function closest(dom, tagName) {
        do {
            if(dom.tagName == tagName)
                return dom;
        }while(dom = dom.parentNode);
        return false;
    }
    
    /**
     * 设置translateX属性 用于滑动
     */
    function setTranslateX(dom, i, size, offsetX) {
        dom.style.webkitTransform = 'translateX('+(offsetX + size.width * i)+'px)';
    }
    
    /**
     * 设置transition属性
     */
    function setTransition(dom, easing, time) {
        if(time === undefined) {
            return;
        }
        dom.style.webkitTransition = '-webkit-transform '+time+'s '+easing;
    }
    
    function imgPreview(opts) {
        if(!opts.targets) {
            throw new Error('请传入目标预览图片的容器');
        }
        
        this.opts = extend(opts, defaults); //默认参数与传入参数合并
        this.currentIndex = opts.curIndex;//当前索引
        this.initDom();//初始化动画容器
        this._bind(); //绑定动画事件
        
        this.caculate(this.currentIndex); //初始化子集的偏移量
        this.offset = {X:0, Y:0};   //X轴与Y轴的移动值
        this.opts.auto && this.play();  //初始化自动轮播
    };

    /**
     * 初始化动画容器和dom元素
     */
    imgPreviewProtytype.initDom = function(){
        var _this = this;
        var imgsDom = [];
        var imgs = this.opts.targets.getElementsByTagName('img');
        var previewBox = document.createElement('div');
        previewBox.style.cssText = 'position:fixed;top:0;bottom:0;z-index:7777;width:100%;background:rgba(0,0,0,.9);';

        /* 展示当前图片序号和总数 */
        var numContainer = document.createElement('div');
        numContainer.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:9999;color:#fff;';
        var curNum = document.createElement('span');
        curNum.innerHTML = this.currentIndex + 1;
        numContainer.appendChild(curNum);
        var totalNum = document.createElement('span');
        totalNum.innerHTML = ' / ' + imgs.length;
        numContainer.appendChild(totalNum);
        previewBox.appendChild(numContainer);
        /* 展示图片的容器 */
        var boxContainer = document.createElement('div');
        boxContainer.style.cssText = 'width:100%;height:100%;position:relative;z-index:8888;overflow:hidden;';
        previewBox.appendChild(boxContainer);

        this.previewBox = previewBox;
        this.curNum = curNum;
        document.body.appendChild(this.previewBox);
        this.container = boxContainer;// 动画容器
        this.size = this.container.getBoundingClientRect();//容器尺寸
        for (var i = 0; i < imgs.length; i ++) {
            var imgWrap = document.createElement('div');
            imgWrap.style.cssText = 'position:fixed;left:0;top:0;width:100%;height:100%;';
            var imgObj = document.createElement('img');
            imgObj.src = imgs[i].src;
            var newUseStyle = _this.getImgAttrs(imgObj);
            imgObj.style.position = 'absolute';
            imgObj.style.width = newUseStyle.width + 'px';
            imgObj.style.height = newUseStyle.height + 'px';
            imgObj.style.left = newUseStyle.left + 'px';
            imgObj.style.top = newUseStyle.top + 'px';
            imgWrap.appendChild(imgObj);
            imgsDom.push(imgWrap);
            boxContainer.appendChild(imgWrap);
        }
        this.children = slice.call(imgsDom);//容器的子集
        this.last = this.children.length - 1; //子集最后一位
    }

    /**
     * 通过图片原始尺寸计算图片在容器中的属性
     */
    imgPreviewProtytype.getImgAttrs = function(imgObj){
        var _this  = this;
        var hPlace = 10;             // 图片宽>=高（左右留空，上下自适配），宽<高（上下留空，左右自适配）
        var vPlace = 50;             // 图片宽>=高（左右留空，上下自适配），宽<高（上下留空，左右自适配）
        var result = {};             // 保存图片css属性

        var width, height;
        if (imgObj.naturalWidth) {   // 现代浏览器
            width = parseInt(imgObj.naturalWidth);
            height = parseInt(imgObj.naturalHeight);
        } else {                     // IE6/7/8
            var newImg = new Image();
            newImg.src = imgObj.src;
            width  = parseInt(newImg.width);
            height = parseInt(newImg.height);
        }

        if ( width >= height ) {
            var remainWidth = _this.size.width - hPlace * 2;
            var scale = remainWidth / width;
            result.width = remainWidth;
            result.height = scale * height;
            result.left = hPlace;
            result.top = (_this.size.height - result.height) / 2;
        } else {
            var remainHeight = _this.size.height - vPlace * 2;
            var scale = remainHeight / height;
            result.width = scale * width;
            result.height = remainHeight;
            result.left = ( _this.size.width - result.width ) / 2;
            result.top = vPlace;
        }
        return result;
    }

    /**
     * 计算滑动值
     * @param {int} index 当前索引值
     * @param {string} time 过渡完成时间
     * @param {int} offsetX
     */
    imgPreviewProtytype.caculate = function(index, time, offsetX) {
        var _this = this, last = this.last;
        this.children.forEach(function(dom, i) {
            var x = i - index;
            if(index == 0 && i == last) {
                x = -1;
            }else if(index == last && i == 0) {
                x = 1;
            }
            setTransition(dom, _this.opts.easing, time);
            setTranslateX(dom, x, _this.size, offsetX||0);
        });
    };
    
    /**
     * 滑动到指定处
     * @param {int} index
     * @param {string} time 过渡完成时间
     */
    imgPreviewProtytype.slideTo = function(index, time) {
        this.currentIndex = index = this._setThreshold(index);
        var other = this.direction == CONST.LEFT ? (index-1) : (index+1);
        other = this._setThreshold(other);

        //隐藏需要移动的子集
        this.children.forEach(function(dom, i) {
            if(i == index || i == other) {
                return;
            }
            dom.style.visibility = 'hidden';
        });
        //手指移动的时候用.1 自动移动的时候用.4
        this.caculate(index, time || '.1');
        this._setCurNum(index);
    };
    
    /**
     * 设置索引阈值
     */
    imgPreviewProtytype._setThreshold = function(index) {
        if(index < 0)
            return this.last;
        if(index > this.last)
            return 0;
        return index;
    };


    /**
     * 设置当前显示的图片序号
     */
    imgPreviewProtytype._setCurNum = function(index){
        this.curNum.innerHTML = index + 1;
    }
    
    /**
     * 绑定开始事件
     */
    imgPreviewProtytype.startEvt = function(e) {
        //UC浏览器中在边界滑动会将整个屏幕滑过去 但会阻止滚动
        e.preventDefault();
        this.startTime = new Date().getTime();//开始时间戳
        this.startX = e.touches[0].clientX;//起始坐标
        this.startY = e.touches[0].clientY;//起始坐标
        global.clearTimeout(this.autoName);//取消自动轮播
    };
    
    /**
     * 绑定手指移动事件
     */
    imgPreviewProtytype.moveEvt = function(e) {
        //计算位移
        this.offset = {
            X: e.touches[0].clientX - this.startX,
            Y: e.touches[0].clientY - this.startY
        };
        
        //判断是否在移动
        if(Math.abs(this.offset.X) - Math.abs(this.offset.Y) > 10) {
            e.preventDefault();//Android浏览器中会卡顿
            this.caculate(this.currentIndex, '0', this.offset.X);
        }
    };
    
    /**
     * 绑定结束事件
     */
    imgPreviewProtytype.endEvt = function(e) {
        //超过了容器的一半才能滑动过去
        var boundary = this.size.width / 2;
        var endTime = new Date().getTime();
        var offset = this.offset;

        //300ms间隔算一次快速滑动需要14px
        boundary = endTime - this.startTime > 300 ? boundary : 14;
                
        //做点击操作
        if(Math.abs(offset.X) < 10 && Math.abs(offset.Y) < 10) {
            document.body.removeChild(this.previewBox);
        }
        if(offset.X > boundary) {//向右滑动
            this.direction = CONST.RIGHT;
            this.currentIndex--;
        }else if(offset.X < -boundary) {//向左滑动
            this.direction = CONST.LEFT;
            this.currentIndex++;
        }else {
            //返回原位 方向要相反
            this.direction = offset.X < 0 ? CONST.RIGHT : CONST.LEFT;
        }
        this.slideTo(this.currentIndex);
        //重置偏移对象
        this.offset = {X:0, Y:0};
        this.opts.auto && this.play();//重新启动自动轮播
    };
    
    /**
     * 过渡结束后触发
     */
    imgPreviewProtytype.transitionEvt = function(e) {
        e.target.style.visibility = 'visible';
    };
    
    /**
     * 移动到下一个 子集
     */
    imgPreviewProtytype.slideNext = function() {
        this.direction = CONST.LEFT;
        this.slideTo(++this.currentIndex, '.4');
    };
    
    /**
     * 自动播放
     */
    imgPreviewProtytype.play = function() {
        var _this = this;
        _this.autoName = global.setTimeout(function() {
            _this.slideNext();
            _this.play();
        }, _this.opts.duration);
    };
    /**
     * 绑定事件
     */
    imgPreviewProtytype._bind = function() {
        this.container.addEventListener(events.start, this);
        this.container.addEventListener(events.move, this);
        this.container.addEventListener(events.end, this);
        this.container.addEventListener(events.transition, this.transitionEvt, false);
    };
    
    /**
     * 高级的绑定方法
     */
    imgPreviewProtytype.handleEvent = function(e) {
        switch (e.type) {
            case events.start:
                this.startEvt(e);
                break;
            case events.move:
                this.moveEvt(e);
                break;
            case events.end:
                this.endEvt(e);
                break;
        };
    };
    
    global.imgPreview = imgPreview;
    return imgPreview;
}));