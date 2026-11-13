/* ==========================================================================
   LendLib - JavaScript library for building a book lending tracker
   Modules:
     LendLib.createStore(options)  - loan data, validation, stats, persistence
     LendLib.dom                   - small DOM helpers
     LendLib.table                 - renders loan rows (uses LendKit CSS classes)
     LendLib.form                  - reads form values and shows errors
   ========================================================================== */
(function (global) {
  "use strict";

  var REQUIRED = ["title", "author", "borrower", "dueDate", "genre"];

  function todayISO() {
    var d = new Date();
    return d.getFullYear() + "-" +
      String(d.getMonth() + 1).padStart(2, "0") + "-" +
      String(d.getDate()).padStart(2, "0");
  }

  /* ---------------- Store ---------------- */
  function createStore(options) {
    var key = (options && options.key) || "lendlib:loans";
    var store = {
      loans: [],

      load: function () {
        try {
          var raw = global.localStorage.getItem(key);
          store.loans = raw ? JSON.parse(raw) : [];
        } catch (e) { store.loans = []; }
        return store.loans;
      },

      save: function () {
        try { global.localStorage.setItem(key, JSON.stringify(store.loans)); }
        catch (e) { /* storage unavailable: keep working in memory */ }
      },

      validate: function (data) {
        var errors = {};
        REQUIRED.forEach(function (f) {
          if (!data[f] || !String(data[f]).trim()) errors[f] = "This field is required.";
        });
        return errors;
      },

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
        store.loans.push(loan);
        store.save();
        return loan;
      },

      markReturned: function (id) {
        store.loans.forEach(function (l) { if (l.id === id) l.returned = true; });
        store.save();
      },

      remove: function (id) {
        store.loans = store.loans.filter(function (l) { return l.id !== id; });
        store.save();
      },

      getStatus: function (loan) {
        if (loan.returned) return "Returned";
        return loan.dueDate < todayISO() ? "Overdue" : "Lent";
      },

      stats: function () {
        return {
          total: store.loans.length,
          overdue: store.loans.filter(function (l) { return store.getStatus(l) === "Overdue"; }).length
        };
      }
    };
    return store;
  }

  /* ---------------- DOM helpers ---------------- */
  var dom = {
    el: function (tag, className, text) {
      var node = document.createElement(tag);
      if (className) node.className = className;
      if (text !== undefined) node.textContent = text;
      return node;
    },
    clear: function (node) { node.innerHTML = ""; }
  };

  /* ---------------- Table renderer ---------------- */
  var table = {
    render: function (tbody, loans, opts) {
      dom.clear(tbody);

      loans.forEach(function (loan) {
        var status = opts.getStatus(loan);
        var tr = dom.el("tr", status === "Overdue" ? "lt-row-overdue" : "");

        [loan.title, loan.author, loan.borrower, loan.dueDate, loan.genre].forEach(function (v) {
          tr.appendChild(dom.el("td", "", v));
        });

        var statusCell = dom.el("td");
        statusCell.appendChild(dom.el("span", "lt-badge lt-badge-" + status.toLowerCase(), status));
        tr.appendChild(statusCell);

        var actionCell = dom.el("td");
        var actions = dom.el("div", "lt-actions");

        if (!loan.returned) {
          var returnBtn = dom.el("button", "lt-btn lt-btn-success lt-btn-small", "Return");
          returnBtn.type = "button";
          returnBtn.addEventListener("click", function () { opts.onReturn(loan.id); });
          actions.appendChild(returnBtn);
        }

        var deleteBtn = dom.el("button", "lt-btn lt-btn-danger lt-btn-small", "Delete");
        deleteBtn.type = "button";
        deleteBtn.addEventListener("click", function () { opts.onDelete(loan.id); });
        actions.appendChild(deleteBtn);

        actionCell.appendChild(actions);
        tr.appendChild(actionCell);
        tbody.appendChild(tr);
      });
    }
  };

  /* ---------------- Form helpers ---------------- */
  var form = {
    fields: REQUIRED,

    read: function () {
      var data = {};
      REQUIRED.forEach(function (f) { data[f] = document.getElementById(f).value; });
      return data;
    },

    showErrors: function (errors) {
      REQUIRED.forEach(function (f) {
        document.getElementById(f + "Error").textContent = errors[f] || "";
        document.getElementById(f).classList.toggle("lt-input-invalid", !!errors[f]);
      });
    }
  };

  global.LendLib = { createStore: createStore, dom: dom, table: table, form: form };
})(window);
