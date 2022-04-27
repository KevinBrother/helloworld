# RxJS

- 最核心的就是Observable都是围绕着它在转

## 观察者模式与迭代器模式

- 两种设计模式都是渐进式的，Observer是生产者，push对象，iterator是消费者，pull对象
![观察者迭代器模式](https://res.cloudinary.com/dohtkyi84/image/upload/v1482240798/push_pull.png)
- Observable就是两个设计模式的结合

## Observable和Observer的关系

### Observable

- 可以处理同步与异步行为
- Observable的创建可以直接产生数据，然后通过`next()`通知订阅者，也可以给`next()`直接传递参数来通知
- Observable只有被订阅后才会开始执行`next()`

### Observer

- 可以被订阅`subscribe()`，或者说是被观察，订阅Observable的对象就是观察者`Observer`
- 观察者有三个方法 `next, error, complete`
- `observable.subscribe`函数可以依次接受上面的三个函数作为参数，也可以是个一包含上面三个方法的对象，也可以只传递一个函数，就是`next()`

### subscribe

- addEventListener的订阅其实就是观察着模式，它会在内部存有一份订阅清单，有消息时会遍历调用这些订阅方法
- Observable的订阅不是的，`subscribe`就是一个函数，订阅Observable就是执行这个函数，所以代码逻辑就类似下面的

``` javascript
function subscribe(observer) {
  observer.next('Jerry');
  observer.next('Anna');
}

subscribe({
 next: function(value) {
  console.log(value);
 },
 error: function(error) {
  console.log(error)
 },
 complete: function() {
  console.log('complete')
 }
});
```
