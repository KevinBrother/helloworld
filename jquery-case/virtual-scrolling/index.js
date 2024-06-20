import $ from "../lib/jquery-3.7.1.esm.js";
window.$ = $;
import { mockData } from "./utils.js";

class VirtualScrolling {
  data = [];
  containerTopPadding = 20;
  scrollBarHeight = 20;

  constructor({
    data,
    container,
    template,
    pageSize,
    itemHeight,
    containerHeight,
    vsMain,
    vsScrollBar,
    vsScroll,
  }) {
    this.data = data;
    this.container = container;
    this.template = template;
    this.pageSize = pageSize;
    this.itemHeight = itemHeight;
    this.containerHeight = containerHeight;
    this.vsMain = vsMain;
    this.vsScrollBar = vsScrollBar;
    this.vsScroll = vsScroll;
    this.vsMainTotalHeight = data.length * itemHeight;

    this.realContainerHeight =
      this.vsMainTotalHeight + 20 + this.containerTopPadding - containerHeight;

    this.bindEvent();
    this.render();
  }

  bindEvent() {
    // 内存区域滚动事件
    this.vsMain.on("mousewheel", this.handleVSMain);

    // 滚动条点击事件
    this.vsScroll.on("click", this.handleClickVSScroll);

    this.vsScrollBar.on("dragstart", (event) => {
      // 隐藏默认拖动的图片样式
      var transparentImage = new Image();
      transparentImage.src =
        "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";
      event.originalEvent.dataTransfer.setDragImage(transparentImage, 0, 0);
    });

    this.vsScrollBar.on("click", (event) => {
      // 阻止事件冒泡，否则会触发 vsScrollBar 的点击事件，但是offsetY 为 vsScrollBar 元素的值。
      event.stopPropagation();
    });

    this.vsScrollBar.on("drag", (event) => {
      if (event.pageY === 0) {
        return;
      }
      // console.log(event);
      const $parent = $(event.target).parent();
      // 可以通过 getBoundingClientRect 获取元素的位置信息
      const { top } = $parent.offset();
      // console.log(`parent offset top: ${top}, pageY: ${event.pageY}`);
      const total = event.pageY - top;
      if (total < 0) {
        this.vsScrollBar.css("transform", `translateY(0px)`);
        return;
      }

      if (total > this.containerHeight) {
        this.vsScrollBar.css(
          "transform",
          `translateY(${this.containerHeight}px)`
        );
        return;
      }

      this.vsScrollBar.css("transform", `translateY(${total}px)`);
    });
  }

  handleClickVSScroll = (e) => {
    var position =
      e.offsetY < 0
        ? 0
        : e.offsetY > this.containerHeight - this.scrollBarHeight
        ? this.containerHeight - this.scrollBarHeight
        : e.offsetY;
    const percent = position / this.containerHeight;

    const mainPosition = Math.floor(this.vsMainTotalHeight * percent);

    console.log(
      `position: ${position}, offsetY: ${e.offsetY},
       this.containerHeight: ${this.containerHeight}, 
       mainPosition: ${mainPosition}, 
       this.vsMainTotalHeight: ${this.vsMainTotalHeight}`
    );
    this.vsScrollBar.css("transform", `translateY(${position}px)`);
    this.vsMain.css("transform", `translateY(-${mainPosition}px)`);
  };

  handleVSMain = (e) => {
    const translateY = this.vsMain
      .css("transform")
      .match(/matrix\(\d+, \d+, \d+, \d+, \d+, (-?\d+)\)/)[1];

    const total = parseInt(e.originalEvent.wheelDelta) + parseInt(translateY);
    if (total > 0) {
      this.vsMain.css("transform", `translateY(0)`);
      return;
    }

    if (total < -this.realContainerHeight) {
      this.vsMain.css(
        "transform",
        `translateY(${-this.realContainerHeight}px)`
      );
      return;
    }

    this.vsMain.css("transform", `translateY(${total}px)`);
    const percent = Math.abs(total) / this.vsMainTotalHeight;
    const scrollBarOffset = this.containerHeight * percent;
    console.log(
      "🚀 ~ VirtualScrolling ~ percent:",
      percent,
      total,
      this.vsMainTotalHeight,
      scrollBarOffset
    );

    this.vsScrollBar.css("transform", `translateY(${scrollBarOffset}px)`);
  };

  render() {
    const items = this.data.map((item) => {
      return $(this.template).text(item.text);
    });
    this.vsMain.append(items);
  }
}

//
new VirtualScrolling({
  data: mockData(50),
  container: $(".container"),
  vsMain: $(".vs_main"),
  vsScrollBar: $(".vs_scroll_bar"),
  vsScroll: $(".vs_scroll"),
  template: '<div class="inner"></div>',
  pageSize: 10,
  itemHeight: 100 + 10, // TODO 应该可以优化掉
  containerHeight: 520, // TODO 应该可以优化掉
});
