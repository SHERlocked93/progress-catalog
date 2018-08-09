# progress-catalog

这个插件根据选定的目录内容中的 `h1, h2, h3, h4, h5, h6` 标签来自动生成目录插入到选定的目录容器中，并且提供一个漂亮的样式效果

- 监听内容区滚动
- 点击跳转功能

兼容性：IE10+

欢迎提issue，提pr~

## Preview


可以通过 [线上DEMO](http://sherlocked93.club/vue-style-codebase/) 来预览一下效果

## Build Setup

``` bash
# install dependencies
npm install

# serve with hot reload at localhost:8080
npm run dev

# build for production with minification
npm run build

# build for production and view the bundle analyzer report
npm run build --report
```


## Api
如果要使用默认的样式，请手动引入

```js
import 'progress-catalog/progress-catalog.css'
```

使用方法：
```js
import Catalog from 'ProgressCatalog'


```

### contentEl [String]
需要检索生成目录的内容区wrapper的id选择器，不需要加#

### catalogEl [String]
将生成的目录append进的容器wrapper的id选择器，不需要加#

### linkClass [String]
所有目录项都有的类，默认值：`cl-link`

### selector [可选, Array]
选择目录的标题标签，默认值：`['h1', 'h2', 'h3', 'h4', 'h5', 'h6']`

如果只希望生成目标内容区的 h2, h3 标签的目录，那么可以设置 `selector: ['h2', 'h3']`

### active [可选, Function]
当激活
