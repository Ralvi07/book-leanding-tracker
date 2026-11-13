/* ==========================================================================
   LendLib - JavaScript library for managing book loans
   Pure logic: no DOM access, so it can be reused or tested on its own.
   ========================================================================== */
(function (global) {
  "use strict";

  var STORAGE_KEY = "book-lending-tracker:loans";

  function todayISO() {
    var d = new Date();
    var m = String(d.getMonth() + 1).padStart(2, "0");
    var day = String(d.getDate()).padStart(2, "0");
    return d.getFullYear() + "-" + m + "-" + day;
  }

  var LendLib = {
    loans: [],

    /* ----- Persistence ----- */
    load: function () {
      try {
        var raw = global.localStorage.getItem(STORAGE_KEY);
        this.loans = raw ? JSON.parse(raw) : [];
      } catch (e) {
        this.loans = [];
      }
      return this.loans;
    },

    save: function () {
      try {
        global.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.loans));
      } catch (e) { /* storage unavailable: keep working in memory */ }
    },

    /* ----- Validation ----- */
    validate: function (data) {
      var errors = {};
      ["title", "author", "borrower", "dueDate", "genre"].forEach(function (field) {
        if (!data[field] || !String(data[field]).trim()) {
          errors[field] = "This field is required.";
        }
      });
      return errors;
    },

    /* ----- CRUD ----- */
    add: function (data) {
      var loan = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
        title: data.title.trim(),
        author: data.author.trim(),
        borrower: data.borrower.trim(),
        dueDate: data.dueDate,
        genre: data.genre.trim(),
        returned: false
      };
      this.loans.push(loan);
      this.save();
      return loan;
    },

    markReturned: function (id) {
      this.loans.forEach(function (l) { if (l.id === id) l.returned = true; });
      this.save();
    },

    remove: function (id) {
      this.loans = this.loans.filter(function (l) { return l.id !== id; });
      this.save();
    },

    /* ----- Status & stats ----- */
    getStatus: function (loan) {
      if (loan.returned) return "Returned";
      return loan.dueDate < todayISO() ? "Overdue" : "Lent";
    },

    stats: function () {
      var self = this;
      return {
        total: this.loans.length,
        overdue: this.loans.filter(function (l) { return self.getStatus(l) === "Overdue"; }).length
      };
    }
  };

  global.LendLib = LendLib;
})(window);


/* ==========================================================================
   App - wires LendLib to the page
   ========================================================================== */
(function () {
  "use strict";

  var FIELDS = ["title", "author", "borrower", "dueDate", "genre"];
  var form = document.getElementById("loanForm");
  var tbody = document.getElementById("loanTableBody");
  var emptyMessage = document.getElementById("emptyMessage");
  var totalEl = document.getElementById("totalLoans");
  var overdueEl = document.getElementById("overdueLoans");

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function render() {
    tbody.innerHTML = "";

    LendLib.loans.forEach(function (loan) {
      var status = LendLib.getStatus(loan);
      var tr = el("tr", status === "Overdue" ? "lt-row-overdue" : "");

      [loan.title, loan.author, loan.borrower, loan.dueDate, loan.genre].forEach(function (value) {
        tr.appendChild(el("td", "", value));
      });

      var statusCell = el("td");
      statusCell.appendChild(el("span", "lt-badge lt-badge-" + status.toLowerCase(), status));
      tr.appendChild(statusCell);

      var actionCell = el("td");
      var actions = el("div", "lt-actions");

      if (!loan.returned) {
        var returnBtn = el("button", "lt-btn lt-btn-success lt-btn-small", "Return");
        returnBtn.type = "button";
        returnBtn.addEventListener("click", function () {
          LendLib.markReturned(loan.id);
          render();
        });
        actions.appendChild(returnBtn);
      }

      var deleteBtn = el("button", "lt-btn lt-btn-danger lt-btn-small", "Delete");
      deleteBtn.type = "button";
      deleteBtn.addEventListener("click", function () {
        LendLib.remove(loan.id);
        render();
      });
      actions.appendChild(deleteBtn);

      actionCell.appendChild(actions);
      tr.appendChild(actionCell);
      tbody.appendChild(tr);
    });

    var s = LendLib.stats();
    totalEl.textContent = s.total;
    overdueEl.textContent = s.overdue;
    emptyMessage.classList.toggle("lt-hidden", s.total > 0);
  }

  function showErrors(errors) {
    FIELDS.forEach(function (f) {
      document.getElementById(f + "Error").textContent = errors[f] || "";
      document.getElementById(f).classList.toggle("lt-input-invalid", !!errors[f]);
    });
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();

    var data = {};
    FIELDS.forEach(function (f) { data[f] = document.getElementById(f).value; });

    var errors = LendLib.validate(data);
    showErrors(errors);
    if (Object.keys(errors).length) return;

    LendLib.add(data);
    form.reset();
    render();
  });

  LendLib.load();
  render();
})();
