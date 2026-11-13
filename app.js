/* App: wires the LendLib library to whichever page is open.
   Pages: index.html (summary), add.html (form), loans.html (table). */
(function () {
  "use strict";

  var store = LendLib.createStore({ key: "book-lending-tracker:loans" });
  store.load();

  var formEl = document.getElementById("loanForm");
  var tbody = document.getElementById("loanTableBody");
  var emptyMessage = document.getElementById("emptyMessage");
  var totalEl = document.getElementById("totalLoans");
  var overdueEl = document.getElementById("overdueLoans");

  function render() {
    if (tbody) {
      LendLib.table.render(tbody, store.loans, {
        getStatus: store.getStatus,
        onReturn: function (id) { store.markReturned(id); render(); },
        onDelete: function (id) { store.remove(id); render(); }
      });
      if (emptyMessage) emptyMessage.classList.toggle("lt-hidden", store.loans.length > 0);
    }

    if (totalEl && overdueEl) {
      var s = store.stats();
      totalEl.textContent = s.total;
      overdueEl.textContent = s.overdue;
    }
  }

  if (formEl) {
    formEl.addEventListener("submit", function (event) {
      event.preventDefault();
      var data = LendLib.form.read();
      var errors = store.validate(data);
      LendLib.form.showErrors(errors);
      if (Object.keys(errors).length) return;

      store.add(data);
      window.location.href = "loans.html";
    });
  }

  render();
})();
