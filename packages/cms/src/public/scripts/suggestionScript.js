$('#reason_filter').on('change', function () {
  $('#filter_form').submit()
})

$('.js-set-order').on('click', function (e) {
  e.preventDefault()
  var chosenOrderKey = $(this).attr('data-order_key')
  var filterForm = $('#filter_form')
  var currentOrderKey = filterForm.data('current-order-key')
  var currentOrderSequence = filterForm.data('current-order-sequence')
  $('#order_key').val(chosenOrderKey)
  var chosenOrderSequence =
    chosenOrderKey === currentOrderKey && currentOrderSequence === 'ASC' ? 'DESC' : 'ASC'
  $('#order_sequence').val(chosenOrderSequence)
  filterForm.submit()
})

$('input[type="radio"]').on('change', function () {
  var _this = $(this)
  $.ajax({
    url: '/toggle-suggestions-status',
    method: 'POST',
    data: {
      id: $(this).attr('data-suggestion_id'),
      status: $(this).val(),
    },
    beforeSend: function () {
      $('input[type="radio"][name="suggestion_' + _this.attr('data-suggestion_id') + '"]').attr(
        'disabled',
        'disabled',
      )
    },
    success: function () {
      $('input[type="radio"][name="suggestion_' + _this.attr('data-suggestion_id') + '"]').removeAttr(
        'disabled',
      )
    },
  })
})

$('.deleteSuggestion').on('click', (event) => {
  var button = $(event.currentTarget)
  var suggestionID = button.data('value')
  var result = confirm('Are you sure? This will permanently delete the item')
  if (result) {
    $.ajax({
      url: '/suggestions/' + suggestionID,
      type: 'DELETE',
      success: () => {
        location.reload()
      },
      error: (error) => {
        console.log(error)
      },
    })
  }
})
