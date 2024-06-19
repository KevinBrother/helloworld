import $ from "../lib/jquery-3.7.1.esm.js";
window.$ = $;
import { mockData } from "./utils.js";

class VirtualScrolling {
  data = [];

  constructor({
    data,
    container,
    template,
    pageSize,
    itemHeight,
    containerHeight,
    scrollContainer,
    scrollBar,
  }) {
    this.data = data;
    this.container = container;
    this.template = template;
    this.pageSize = pageSize;
    this.itemHeight = itemHeight;
    this.containerHeight = containerHeight;
    this.scrollContainer = scrollContainer;
    this.scrollBar = scrollBar;

    this.bindEvent();
    this.render();
  }

  bindEvent() {
    // 内存区域滚动事件
    this.scrollContainer.on("mousewheel", this.handleContainer);

    // 滚动条点击事件
    this.scrollBar.on("click", this.handleClickScrollBar);

    // 滚动条拖动事件
    this.scrollBar.on("mousedown", (e) => {
      const startY = e.clientY;
      const startScrollTop = this.scrollContainer.scrollTop();
      const startPercent =
        (startScrollTop /
          (this.scrollContainer.prop("scrollHeight") -
            this.scrollContainer.prop("clientHeight"))) *
        100;

      $(document).on("mousemove", (e) => {
        const endY = e.clientY;
        const deltaY = endY - startY;
        const percent = startPercent + (deltaY / this.scrollBar.height()) * 100;
        const scrollTop =
          (this.scrollContainer.prop("scrollHeight") -
            this.scrollContainer.prop("clientHeight")) *
          (percent / 100);
        this.scrollContainer.scrollTop(scrollTop);
      });

      $(document).on("mouseup", () => {
        $(document).off("mousemove");
        $(document).off("mouseup");
      });
    });
  }

  handleClickScrollBar = (e) => {
    const scrollHeight = this.scrollContainer.prop("scrollHeight");
    const clientHeight = this.scrollContainer.prop("clientHeight");
    const percent = (e.offsetX / this.scrollBar.width()) * 100;
    const scrollTop = (scrollHeight - clientHeight) * (percent / 100);
    this.scrollContainer.scrollTop(scrollTop);
  };

  handleContainer = (e) => {
    const scrollHeight = this.scrollContainer.prop("scrollHeight");
    const scrollTop = this.scrollContainer.scrollTop();
    const clientHeight = this.scrollContainer.prop("clientHeight");
    const translateY = this.scrollContainer
      .css("transform")
      .match(/matrix\(\d+, \d+, \d+, \d+, \d+, (-?\d+)\)/)[1];

    const total = parseInt(e.originalEvent.wheelDelta) + parseInt(translateY);
    console.log(total);
    if (total > 0) {
      this.scrollContainer.css("transform", `translateY(0)`);
      return;
    }

    this.scrollContainer.css("transform", `translateY(${total}px)`);
    const percent = (scrollTop / (scrollHeight - clientHeight)) * 100;
    this.scrollBar.css("width", percent + "%");
  };

  render() {
    const items = this.data.map((item) => {
      return $(this.template).text(item.text);
    });
    this.scrollContainer.append(items);
  }
}

//
new VirtualScrolling({
  data: mockData(),
  container: $(".container"),
  scrollContainer: $(".scroll-container"),
  scrollBar: $(".vs_scroll_bar-bar"),
  template: '<div class="inner"></div>',
  pageSize: 10,
  itemHeight: 30, // TODO 应该可以优化掉
  containerHeight: 500, // TODO 应该可以优化掉
});
