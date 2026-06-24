// =============== Modal Population ========================
$('#ageCategoryModal').on('show.bs.modal', (event) => {
  $('#errorAgeCategory1').hide()
  var button = $(event.relatedTarget)
  var ageCategoryId = button.data('value')

  if (ageCategoryId === 0) {
    $('.modal-title').text('Insert New Age Category')
    $('#colAgeCategory0TableModal').val('')
    $('#colAgeCategory1TableModal').val('')
    $('#colAgeCategory2TableModal').val('')
    $('#colAgeCategory3TableModal').prop('checked', false)
    $('#itemID').text(0)
    return
  }

  var ageCategories = JSON.parse($('#ageCategoriesJSON').text())
  var ageCategoryInfo = ageCategories.find((item) => {
    return item.id === ageCategoryId
  })

  $('.modal-title').text(ageCategoryInfo.name)
  $('#colAgeCategory0TableModal').val(ageCategoryInfo.name)
  $('#colAgeCategory1TableModal').val(ageCategoryInfo.minAge || '')
  $('#colAgeCategory2TableModal').val(ageCategoryInfo.maxAge || '')
  $('#colAgeCategory3TableModal').prop('checked', !!ageCategoryInfo.isGlobal)
  $('#itemID').text(ageCategoryId)
})

// =============== Modal Confirmation ========================
$('#btnAgeCategoryConfirm').on('click', () => {
  const ageCategoryId = $('#itemID').text()
  const data = {
    name: $('#colAgeCategory0TableModal').val(),
    minAge: Number($('#colAgeCategory1TableModal').val()) || null,
    maxAge: Number($('#colAgeCategory2TableModal').val()) || null,
    isGlobal: $('#colAgeCategory3TableModal').prop('checked'),
  }

  if (data.name === '') {
    $('#errorAgeCategory1').show()
    return
  }

  $.ajax({
    url: '/age-categories' + (ageCategoryId === '0' ? '' : '/' + ageCategoryId),
    type: ageCategoryId === '0' ? 'POST' : 'PUT',
    data: data,
    success: (result) => {
      if (result.isExist) {
        alert('Age category with this name already exists')
      } else {
        location.reload()
      }
    },
    error: (error) => {
      console.log(error)
    },
  })
})

const toggleAgeCategoryGlobal = (id, isGlobal) => {
  $.ajax({
    url: '/age-categories/' + id,
    type: 'PUT',
    data: {
      isGlobal: isGlobal ? false : true,
      toggleOnly: 1,
    },
    success: () => {
      location.reload()
    },
    error: (error) => {
      console.log(error)
    },
  })
}

$(document).on('change', '.js-toggle-age-category-global', function () {
  toggleAgeCategoryGlobal($(this).data('age-category-id'), $(this).data('is-global'))
})

// ==================== Deletion =============================
$('.deleteAgeCategory').on('click', (event) => {
  var button = $(event.currentTarget)
  var ageCategoryId = button.data('value')
  var result = confirm('Are you sure? This will permanently delete the age category')

  if (result) {
    $.ajax({
      url: '/age-categories/' + ageCategoryId,
      type: 'DELETE',
      success: (result) => {
        location.reload()
      },
      error: (error) => {
        console.log(error)
      },
    })
  }
})
