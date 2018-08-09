export default function(opts) {
  let defaultOpts = {
    linkClass: 'cl-link',                             // 所有目录项都有的类
    linkActiveClass: 'cl-link-active',                // active的目录项
    datasetName: 'data-cata-target',                  // 目录项DOM的attribute存放对应目录的id
    selector: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'],   // 按优先级排序
    scrollWrapper: null,                              // 按优先级排序
    activeHook: null,                                 // 激活时候回调
    topMargin: 0,
    bottomMargin: 0,
    cool: true                                        // 炫酷模式开关
  }
  
  const Opt = Object.assign({}, defaultOpts, opts)
  
  const $content = document.getElementById(Opt.contentEl)                          // 内容获取区
  const $scroll_wrap = Opt.scrollWrapper || $content.parentNode || document.body   // 内容元素的父元素
  const $catalog = document.getElementById(Opt.catalogEl)                          // 目录容器
  
  let allCatalogs = $content.querySelectorAll(Opt.selector.join())
  let tree = getCatalogsTree(allCatalogs)
  
  try {
    $catalog.innerHTML = `<div class='cl-wrapper'>${generateHtmlTree(tree, { id: -1 })}<svg class="cl-marker" width="200" height="200" xmlns="http://www.w3.org/2000/svg">
            <path stroke="#42B983" stroke-width="3" fill="transparent" stroke-dasharray="0, 0, 0, 1000" stroke-linecap="round" stroke-linejoin="round" transform="translate(-0.5, -0.5)" />
            </svg></div>`
  } catch (e) {
    console.error('error in progress-catalog', e)
  }
  
  
  const tocPath = $catalog.querySelector('.cl-marker path')
  let tocItems, pathLength    // 左边svg-path长度
  
  // 事件注册
  window.addEventListener('resize', drawPath)
  $catalog.addEventListener('click', clickHandler)
  Opt.cool && $scroll_wrap.addEventListener('scroll', coolScrollHandler)
  Opt.cool || $scroll_wrap.addEventListener('scroll', simpleScrollHandler)
  
  setTimeout(drawPath)          // 放在宏任务中，防止找不到DOM
  
  /**
   * 画出svg路径
   */
  function drawPath() {
    tocItems = [...$catalog.querySelectorAll('li')]
    tocItems = tocItems.map(function(liDom) {
      const anchor = liDom.querySelector(`.${Opt.linkClass}`)
      const target = document.getElementById(anchor.getAttribute('data-cata-target'))
      
      return {
        listItem: liDom,
        anchor: anchor,
        target: target
      }
    })
    tocItems = tocItems.filter(item => !!item.target)
    
    const path = []
    let pathIndent
    
    tocItems.forEach(function(item, idx) {
      const { offsetLeft, offsetTop, offsetHeight } = item.anchor,
        x = Opt.cool ? offsetLeft - 5 : offsetLeft,
        y = offsetTop,
        height = offsetHeight
      
      if (idx === 0) {
        path.push('M', x, y, 'L', x, y + height)
        item.pathStart = 0
      }
      else {
        if (pathIndent !== x) path.push('L', pathIndent, y)     // 缩进级别发生变化
        path.push('L', x, y)
        tocPath.setAttribute('d', path.join(' '))
        item.pathStart = tocPath.getTotalLength() || 0
        path.push('L', x, y + height)
      }
      pathIndent = x
      tocPath.setAttribute('d', path.join(' '))
      item.pathEnd = tocPath.getTotalLength()
    })
    pathLength = tocPath.getTotalLength()
    coolScrollHandler()
  }
  
  /**
   * 炫酷模式下滚动事件
   */
  function coolScrollHandler() {
    const wrapHeight = $scroll_wrap.clientHeight
    let pathStart = pathLength,
      pathEnd = 0,
      visibleItems = 0
    tocItems.forEach(function(liItem) {
      const { bottom, top } = liItem.target.getBoundingClientRect(),
        firstChild = liItem.listItem.firstChild
      if (bottom > Opt.topMargin && top < wrapHeight - Opt.bottomMargin) {
        pathStart = Math.min(liItem.pathStart, pathStart)
        pathEnd = Math.max(liItem.pathEnd, pathEnd)
        visibleItems += 1
        firstChild.classList.add(Opt.linkActiveClass)
        Opt.cool && firstChild.classList.add('cl-transform')
      } else {
        firstChild.classList.remove(Opt.linkActiveClass)
        Opt.cool && firstChild.classList.remove('cl-transform')
      }
    })
    if (visibleItems > 0 && pathStart < pathEnd && Opt.cool) {
      tocPath.setAttribute('stroke-dashoffset', '1')
      tocPath.setAttribute('stroke-dasharray', `1, ${pathStart}, ${pathEnd - pathStart}, ${pathLength}`)
      tocPath.setAttribute('opacity', '1')
    }
    else {
      tocPath.setAttribute('opacity', '0')
    }
  }
  
  /**
   * 普通模式下滚动事件
   */
  function simpleScrollHandler(el) {
    let scrollToEl = null
    for (let i = allCatalogs.length - 1; i >= 0; i--) {
      if (allCatalogs[i].offsetTop <= $scroll_wrap.scrollTop) {
        scrollToEl = allCatalogs[i]
        break
      }
    }
    if (scrollToEl) setActiveItem(scrollToEl.id)
    else setActiveItem(null)            // 无匹配的元素
  }
  
  /* 点击事件 */
  function clickHandler({ target }) {
    const datasetId = target.getAttribute(Opt.datasetName)
    target.classList.contains(Opt.linkClass) &&
    document.getElementById(datasetId)
      .scrollIntoView({ behavior: "smooth", block: "start" })
  }
  
  /**
   * 获取目录树，生成类似于Vnode的树
   * @param catalogs
   */
  function getCatalogsTree(catalogs) {
    let title, tagName, tree = [], treeItem = {}, parentItem = { id: -1 }, lastTreeItem = null, id
    
    for (let i = 0; i < catalogs.length; i++) {
      title = catalogs[i].innerText || catalogs[i].textContent
      tagName = catalogs[i].tagName
      id = 'heading-' + i
      catalogs[i].id = id
      treeItem = {
        name: title,
        tagName: tagName,
        id: id,
        level: +getLevel(tagName),
        parent: parentItem
      }
      if (lastTreeItem) {
        if (getLevel(treeItem.tagName) > getLevel(lastTreeItem.tagName)) {
          treeItem.parent = lastTreeItem
        } else {
          treeItem.parent = findParent(treeItem, lastTreeItem)
        }
      }
      lastTreeItem = treeItem
      tree.push(treeItem)
    }
    return tree
  }
  
  /**
   * 找到当前节点的父级
   * @param currTreeItem
   * @param lastTreeItem
   * @returns {*|Window}
   */
  function findParent(currTreeItem, lastTreeItem) {
    let lastTreeParent = lastTreeItem.parent
    while (lastTreeParent && (getLevel(currTreeItem.tagName) <= getLevel(lastTreeParent.tagName))) {
      lastTreeParent = lastTreeParent.parent
    }
    return lastTreeParent || { id: -1 }
  }
  
  /**
   *  获取等级
   * @param tagName
   * @returns {*}
   */
  function getLevel(tagName) {
    return tagName ? tagName.slice(1) : 0
  }
  
  /**
   * 生成DOM树
   * @param tree
   * @param _parent
   * @return {string}
   */
  function generateHtmlTree(tree, _parent) {
    let ul, hasChild = false
    if (tree) {
      ul = `<ul>`
      for (let i = 0; i < tree.length; i++) {
        if (isEqual(tree[i].parent, _parent)) {
          hasChild = true
          ul += `<li><div class='${ Opt.linkClass } cl-level-${ tree[i].level }' ${Opt.datasetName}='${ tree[i].id }'>${tree[i].name}</div>`
          ul += generateHtmlTree(tree, tree[i])
          ul += '</li>'
        }
      }
      ul += `</ul>`
    }
    return hasChild ? ul : ''
  }
  
  function isEqual(node, node2) {
    return node && node2 && typeof node === 'object' && typeof node2 === 'object' && node.id === node2.id
  }
  
  /**
   *  设置选中的项
   */
  function setActiveItem(id) {
    let catas = [...$catalog.querySelectorAll(`[${Opt.datasetName}]`)]
    
    catas.forEach(T => {
      if (T.getAttribute(Opt.datasetName) === id) {
        typeof Opt.activeHook === 'function' &&
        !T.classList.contains(Opt.linkActiveClass) &&
        Opt.activeHook.call(this, T)                    // 执行active钩子
        T.classList.add(Opt.linkActiveClass)
      } else {
        T.classList.remove(Opt.linkActiveClass)
      }
    })
  }
}
