function setSubmenuState(menuTitle, isOpen) {
  const menuSection = menuTitle.parentElement
  const submenu = menuSection.querySelector('.submenu')
  const icon = menuTitle.querySelector('.submenu-icon')

  submenu.style.maxHeight = isOpen ? submenu.scrollHeight + 'px' : '0px'
  icon.style.transform = isOpen ? 'rotate(180deg)' : 'rotate(0deg)'
}

document.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('.js-toggle-submenu').forEach((menuTitle) => {
    menuTitle.addEventListener('click', function () {
      const submenu = menuTitle.parentElement.querySelector('.submenu')
      setSubmenuState(menuTitle, !(submenu.style.maxHeight && submenu.style.maxHeight !== '0px'))
    })
  })

  const currentPath = window.location.pathname

  document.querySelectorAll('.menu-section').forEach((section) => {
    const links = section.querySelectorAll('.submenu a')

    links.forEach((link) => {
      if (link.getAttribute('href') === currentPath) {
        setSubmenuState(section.querySelector('.menu-title'), true)
      }
    })
  })
})
