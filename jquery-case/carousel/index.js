class State {
  imgCount = 5;
  index = 0;
  timer = null;
}

const state = new State();

// 切换广告图片
function imgChange() {
  if (state.index > state.imgCount - 1) {
    state.index = 0;
  }

  if (state.index < 0) {
    state.index = state.imgCount - 1;
  }

  $(".slides img").animate(
    { left: `-${100 * state.index}%`, duration: 400 }
  );

  $(".dot").removeClass("active");
  $(".dot").eq(state.index).addClass("active");
}

$('.dot').on('click', function() {
  const index = $(this).index();
  state.index = index;
  imgChange();
})

// 自定义 动画 完成广告图自动切换功能，动画完成时间为 400ms
function autoChange() {
  console.log("开始计时");
  state.timer = setInterval(() => {
    state.index++;
    imgChange();
  }, 1000);
}

// 鼠标放入停止自动播放，且展示左右箭头。 鼠标移出开始自动播放，且隐藏左右箭头。
function stopChange() {
  console.log("停止计时");
  clearInterval(state.timer);
}

// 点击左箭头功能，切换到上一张广告图。动画时间 400ms。
$(".prev").on("click", function () {
  state.index--;
  imgChange();
});

// 点击右箭头功能，切换到下一张广告图。动画时间 400ms。
$(".next").on("click", function () {
  state.index++;
  imgChange();
  // console.log("🚀 ~ $ ~ next:");
});

$(document).on({ mouseenter: stopChange, mouseleave: autoChange });

autoChange();
