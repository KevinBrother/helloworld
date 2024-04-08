# export 和 import

## js中 什么时候需要 import * as xxx from 'xxxxx', 什么时候可以直接  import  xxx from 'xxxxx' ?

 import  xxx from 'xxxxx' 只能导入  export default 导出的模块

 import * as xxx from 'xxxxx' 会导入 所有 export 的模块，包括 export default 导出的模块