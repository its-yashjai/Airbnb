(() => {
  'use strict'

  // Fetch all the forms we want to apply custom validation styles to
  const forms = document.querySelectorAll('.needs-validation')

  // Loop over them and prevent submission
  Array.from(forms).forEach(form => {
    form.addEventListener('submit', event => {
      if (!form.checkValidity()) {
        event.preventDefault()
        event.stopPropagation()
      }

      form.classList.add('was-validated')
    }, false)
  })

  // Mobile navbar toggle
  const navToggle = document.getElementById('navToggle')
  const navMenu = document.getElementById('navMenu')

  if (navToggle && navMenu) {
    navToggle.addEventListener('click', () => {
      navMenu.classList.toggle('active')
    })
  }
})()