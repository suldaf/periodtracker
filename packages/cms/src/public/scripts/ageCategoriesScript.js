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
  $('#itemID').text(ageCategoryId)
})

// =============== Modal Confirmation ========================
$('#btnAgeCategoryConfirm').on('click', () => {
  const ageCategoryId = $('#itemID').text()
  const data = {
    name: $('#colAgeCategory0TableModal').val(),
    minAge: $('#colAgeCategory1TableModal').val() || null,
    maxAge: $('#colAgeCategory2TableModal').val() || null,
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
