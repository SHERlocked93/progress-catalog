export default function(opts) {
  let defaultOpts = {
    linkClass: 'cl-link',                             // 所有目录项都有的类
    linkActiveClass: 'cl-link-active',                // active的目录项
    datasetName: 'data-cata-target',                  // 目录项DOM的attribute存放对应目录的id
    selector: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'],   // 按优先级排序
    scrollWrapper: null,                              // 按优先级排序
    active: null                                      // 激活时候回调
  }
  
  const Opt = Object.assign({}, defaultOpts, opts)
  
  const $content = document.getElementById(Opt.contentEl)                          // 内容获取区
  const $scroll_wrap = Opt.scrollWrapper || $content.parentNode || document.body   // 内容元素的父元素
  const $catelog = document.getElementById(Opt.catelogEl)                          // 目录容器
  
  let allCatelogs = $content.querySelectorAll(Opt.selector.join())
  let tree = getCatelogsTree(allCatelogs)
  
  $catelog.innerHTML = `<div class='cl-wrapper'>${generateHtmlTree(tree, { id: -1 })}<svg class="cl-marker" width="200" height="200" xmlns="http://www.w3.org/2000/svg">
            <path stroke="#42B983" stroke-width="3" fill="transparent" stroke-dasharray="0, 0, 0, 1000" stroke-linecap="round" stroke-linejoin="round" transform="translate(-0.5, -0.5)" />
            </svg></div>`
  
  const tocPath = document.querySelector('.cl-marker path')
  let tocItems
  
  // Factor of screen size that the element must cross
  // before it's considered visible
  const TOP_MARGIN = 0.05,
    BOTTOM_MARGIN = 0
  
  let pathLength        // 左边svg-path长度
  
  window.addEventListener('resize', drawPath, false)
  $scroll_wrap.addEventListener('scroll', sync, false)
  
  drawPath()
  
  /**
   * 画出svg路径
   */
  function drawPath() {
    tocItems = [...$catelog.querySelectorAll('li')]
    // Cache element references and measurements
    tocItems = tocItems.map(function(liDom) {
      const anchor = liDom.querySelector(`.${Opt.linkClass}`)
      const target = document.getElementById(anchor.getAttribute('data-cata-target'))
      
      return {
        listItem: liDom,
        anchor: anchor,
        target: target
      }
    })
    // Remove missing targets
    tocItems = tocItems.filter(item => !!item.target)
    
    const path = []
    let pathIndent
    
    tocItems.forEach(function(item, i) {
      
      const x = item.anchor.offsetLeft - 5,
        y = item.anchor.offsetTop,
        height = item.anchor.offsetHeight
      
      if (i === 0) {
        path.push('M', x, y, 'L', x, y + height)
        item.pathStart = 0
      }
      else {
        // Draw an additional line when there's a change in
        // indent levels
        if (pathIndent !== x) path.push('L', pathIndent, y)
        path.push('L', x, y)
        // Set the current path so that we can measure it
        tocPath.setAttribute('d', path.join(' '))
        item.pathStart = tocPath.getTotalLength() || 0
        path.push('L', x, y + height)
      }
      pathIndent = x
      tocPath.setAttribute('d', path.join(' '))
      item.pathEnd = tocPath.getTotalLength()
    })
    pathLength = tocPath.getTotalLength()
    sync()
  }
  
  function sync() {
    const wrapHeight = $scroll_wrap.clientHeight
    let pathStart = pathLength,
      pathEnd = 0,
      visibleItems = 0
    tocItems.forEach(function(liItem) {
      const { bottom, top } = liItem.target.getBoundingClientRect()
      if (bottom > wrapHeight * TOP_MARGIN && top < wrapHeight * (1 - BOTTOM_MARGIN)) {
        pathStart = Math.min(liItem.pathStart, pathStart)
        pathEnd = Math.max(liItem.pathEnd, pathEnd)
        visibleItems += 1
        liItem.listItem.classList.add('visible')
      } else {
        liItem.listItem.classList.remove('visible')
      }
    })
    if (visibleItems > 0 && pathStart < pathEnd) {
      tocPath.setAttribute('stroke-dashoffset', '1')
      tocPath.setAttribute('stroke-dasharray', `1, ${pathStart}, ${pathEnd - pathStart}, ${pathLength}`)
      tocPath.setAttribute('opacity', '1')
    }
    else {
      tocPath.setAttribute('opacity', '0')
    }
  }
  
  /**
   * 滚动处理事件
   * @param e
   */
  $scroll_wrap.addEventListener('scroll', function resolveScroll(el) {
    let scrollToEl = null
    for (let i = allCatelogs.length - 1; i >= 0; i--) {
      if (allCatelogs[i].offsetTop <= $scroll_wrap.scrollTop) {
        scrollToEl = allCatelogs[i]
        break
      }
    }
    if (scrollToEl) setActiveItem(scrollToEl.id)
    else setActiveItem(null)            // 无匹配的元素
  })
  
  /* 点击事件 */
  $catelog.addEventListener('click', function({ target }) {
    const datasetId = target.getAttribute(Opt.datasetName)
    target.classList.contains(Opt.linkClass) &&
    document.getElementById(datasetId)
      .scrollIntoView({ behavior: "smooth", block: "start" })
  })
  
  /**
   * 获取目录树，生成类似于Vnode的树
   * @param catelogs
   */
  function getCatelogsTree(catelogs) {
    let title, tagName, tree = [], treeItem = {}, parentItem = { id: -1 }, lastTreeItem = null, id
    
    for (let i = 0; i < catelogs.length; i++) {
      title = catelogs[i].innerText || catelogs[i].textContent
      tagName = catelogs[i].tagName
      id = 'heading-' + i
      catelogs[i].id = id
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
    let catas = [...$catelog.querySelectorAll(`[${Opt.datasetName}]`)]
    
    catas.forEach(T => {
      if (T.getAttribute(Opt.datasetName) === id) {
        T.classList.add(Opt.linkActiveClass)
        typeof Opt.active === 'function' &&
        Opt.active.call(this, T)                    // 执行active钩子
      } else {
        T.classList.remove(Opt.linkActiveClass)
      }
    })
  }
}
