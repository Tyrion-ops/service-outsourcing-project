/* ==========================================================================
   AI 学习任务管理器 · 交互原型
   ========================================================================== */

(function () {
  'use strict';

  var CONFIG = {
    toastDuration: 3000,
    apiDelay: 800,
    hourStart: 8,
    hourEnd: 21,
    hourHeight: 40
  };

  var TAB_ITEMS = [
    { id: 'P01', label: '今天' },
    { id: 'P05', label: '本周' },
    { id: 'P11', label: '学期' },
    { id: 'P10', label: '我的' }
  ];

  // 二级页归属哪个 tab（否则底部导航没有高亮项，用户失去位置感）
  var TAB_PARENT = {
    P02: 'P01', P03: 'P01', P04: 'P01',
    P06: 'P05', P07: 'P01', P08: 'P01', P09: 'P10'
  };

  var app = document.getElementById('app');
  var toastEl = document.getElementById('toast');
  var viewHistory = [];
  var toastTimer = null;

  /* ---------- Toast ---------- */

  function showToast(message, duration) {
    if (!toastEl || !message) return;

    clearTimeout(toastTimer);
    toastEl.textContent = message;
    toastEl.classList.add('is-visible');

    toastTimer = window.setTimeout(function () {
      toastEl.classList.remove('is-visible');
    }, typeof duration === 'number' ? duration : CONFIG.toastDuration);
  }

  /* ---------- 表单校验 ---------- */

  var FIELD_ERROR_TEXT = '此项不能为空';

  function getFieldWrapper(field) {
    return field.closest('.content-card') || field.parentNode;
  }

  function showFieldError(field, message) {
    var wrapper = getFieldWrapper(field);
    if (!wrapper) return;

    field.classList.add('is-invalid');
    wrapper.classList.add('has-error');

    var errorEl = wrapper.querySelector('.field-error');
    if (!errorEl) {
      errorEl = document.createElement('p');
      errorEl.className = 'field-error';
      errorEl.setAttribute('role', 'alert');
      wrapper.appendChild(errorEl);
    }
    errorEl.textContent = message || FIELD_ERROR_TEXT;
  }

  function clearFieldError(field) {
    var wrapper = getFieldWrapper(field);
    if (!wrapper) return;

    field.classList.remove('is-invalid');
    wrapper.classList.remove('has-error');

    var errorEl = wrapper.querySelector('.field-error');
    if (errorEl) errorEl.remove();
  }

  function validateField(field) {
    if (!field) return true;

    if (!(field.value || '').trim()) {
      showFieldError(field);
      field.focus();
      return false;
    }

    clearFieldError(field);
    return true;
  }

  function bindFieldEvents(field) {
    if (!field) return;

    field.addEventListener('input', function () {
      if (field.classList.contains('is-invalid') && field.value.trim()) {
        clearFieldError(field);
      }
    });
  }

  /* ---------- 数据请求 ---------- */

  var MOCK_TASKS = [
    { id: 1, title: '高等数学 · P120 习题', course: '高数', hours: 1.5, due: '周五 23:59' },
    { id: 2, title: '英语作文 300 词', course: '英语', hours: 1, due: '周五 23:59' },
    { id: 3, title: '数据库实验报告', course: '数据库', hours: 4, due: '周五 23:59' },
    { id: 4, title: '毛概论文 · 终稿', course: '毛概', hours: 2, due: '下周一 23:59' },
    { id: 5, title: '离散数学 · 期中复习', course: '离散', hours: 1.5, due: '本周日 23:59' },
    { id: 6, title: '物理预习 · 第 5 章', course: '物理', hours: 1, due: '周四 23:59' },
    { id: 7, title: '英语随堂测复习', course: '英语', hours: 0.5, due: '周五 10:00' },
    { id: 8, title: '数据库上机准备', course: '数据库', hours: 0.5, due: '周四 14:00' }
  ];

  // 演示失败：地址后加 ?fail=1
  function mockFetchTasks() {
    var shouldFail = new URLSearchParams(window.location.search).get('fail') === '1';

    return new Promise(function (resolve, reject) {
      window.setTimeout(function () {
        if (shouldFail) {
          reject(new Error('NETWORK_ERROR'));
          return;
        }
        resolve({ ok: true, data: MOCK_TASKS });
      }, CONFIG.apiDelay);
    });
  }

  // 12 → "12"，10.5 → "10.5"
  function formatHours(total) {
    return String(Math.round(total * 10) / 10);
  }

  async function loadTaskList() {
    var summaryEl = document.querySelector('#P01 .alert-banner__title');

    try {
      var response = await mockFetchTasks();

      if (!response || !Array.isArray(response.data)) {
        throw new Error('INVALID_PAYLOAD');
      }

      var tasks = response.data;
      var totalHours = tasks.reduce(function (sum, task) {
        return sum + (Number(task.hours) || 0);
      }, 0);

      if (summaryEl) {
        summaryEl.textContent = '这周 ' + tasks.length + ' 个任务 · 预计 ' + formatHours(totalHours) + ' 小时';
      }

      return tasks;
    } catch (error) {
      // 失败只提示，不清空已有界面
      showToast('网络异常，请稍后重试');
      if (window.console && window.console.warn) {
        console.warn('[loadTaskList]', error.message);
      }
      return null;
    }
  }

  /* ---------- 路由 ---------- */

  function showView(id, push) {
    var target = document.getElementById(id);
    if (!target) return;

    var current = app.querySelector('.view.is-active');
    if (current && push !== false && current.id !== id) {
      viewHistory.push(current.id);
    }

    app.querySelectorAll('.view').forEach(function (viewEl) {
      viewEl.classList.toggle('is-active', viewEl.id === id);
    });

    var viewBody = target.querySelector('.view-body');
    if (viewBody) viewBody.scrollTop = 0;
  }

  function goBack() {
    showView(viewHistory.pop() || 'P01', false);
  }

  /* ---------- 渲染 ---------- */

  function renderTabBars() {
    document.querySelectorAll('[data-tabbar]').forEach(function (bar) {
      var viewEl = bar.closest('.view');
      var activeId = viewEl.id;

      if (!TAB_ITEMS.some(function (item) { return item.id === activeId; })) {
        activeId = TAB_PARENT[activeId] || null;
      }

      bar.innerHTML = TAB_ITEMS.map(function (item) {
        var activeClass = item.id === activeId ? ' is-active' : '';
        return '<button class="tab-bar__item' + activeClass + '" type="button" data-go="' +
          item.id + '"><span class="tab-bar__indicator"></span>' + item.label + '</button>';
      }).join('');
    });
  }

  function renderHourMarks() {
    var host = document.getElementById('hourMarks');
    if (!host) return;

    for (var hour = CONFIG.hourStart; hour <= CONFIG.hourEnd; hour++) {
      var label = document.createElement('span');
      label.textContent = hour + ':00';
      label.style.top = ((hour - CONFIG.hourStart) * CONFIG.hourHeight) + 'px';
      host.appendChild(label);
    }
  }

  function renderTimetable() {
    var head = document.getElementById('weekHead');
    var grid = document.getElementById('weekGrid');
    if (!grid) return;

    var weekdays = ['一', '二', '三', '四', '五'];
    var lessons = {
      '0-0': '高等数学', '0-2': '大学英语',
      '1-1': '线性代数',
      '2-0': '数据库原理',
      '3-2': '离散数学', '3-4': '体育',
      '4-1': '大学物理',
      '5-3': '程序设计'
    };

    if (head) {
      var blank = document.createElement('span');
      blank.className = 'timetable__weekday';
      head.appendChild(blank);

      weekdays.forEach(function (day) {
        var cell = document.createElement('span');
        cell.className = 'timetable__weekday';
        cell.textContent = day;
        head.appendChild(cell);
      });
    }

    for (var period = 0; period < 6; period++) {
      var index = document.createElement('span');
      index.className = 'timetable__period';
      index.textContent = String(period + 1);
      grid.appendChild(index);

      for (var dayIndex = 0; dayIndex < 5; dayIndex++) {
        var cell = document.createElement('span');
        var name = lessons[period + '-' + dayIndex];
        cell.className = 'timetable__cell' + (name ? ' timetable__cell--lesson' : '');
        cell.textContent = name || '';
        grid.appendChild(cell);
      }
    }
  }

  function renderSemesterChart() {
    var host = document.getElementById('weekChart');
    if (!host) return;

    var weekly = [2, 4, 3, 5, 4, 6, 8, 21, 7, 5, 4, 6, 9, 12, 6, 4];
    var currentIndex = 7;
    var max = Math.max.apply(null, weekly);

    weekly.forEach(function (value, index) {
      var bar = document.createElement('span');
      var level = value >= 12 ? 'overloaded' : (value >= 7 ? 'busy' : '');
      var classes = 'semester-chart__bar';

      if (level) classes += ' semester-chart__bar--' + level;
      if (index === currentIndex) classes += ' semester-chart__bar--current';

      bar.className = classes;
      bar.style.height = Math.round((value / max) * 100) + '%';
      bar.title = '第 ' + (index + 1) + ' 周 · ' + value + ' 小时';
      host.appendChild(bar);
    });
  }

  /* ---------- 交互 ---------- */

  var PRIMARY_ACTION_SELECTOR = '.recovery-option';
  var PRIMARY_ACTION_MESSAGE = '已加入计划';

  // 只有带 data-submit 的按钮才校验，否则同屏的「粘贴一段群通知」也会被误拦
  function guardSubmit(trigger) {
    if (!trigger.hasAttribute('data-submit')) return true;

    var field = trigger.closest('.view').querySelector('.note-textarea');
    return field ? validateField(field) : true;
  }

  app.addEventListener('click', function (event) {
    var trigger = event.target.closest(
      '[data-go], [data-back], [data-toast], [data-switch], ' + PRIMARY_ACTION_SELECTOR
    );
    if (!trigger) return;

    if (trigger.hasAttribute('data-switch')) {
      trigger.classList.toggle('is-on');
      return;
    }

    if (trigger.matches(PRIMARY_ACTION_SELECTOR)) {
      showToast(PRIMARY_ACTION_MESSAGE);
      return;
    }

    if (trigger.hasAttribute('data-back')) {
      goBack();
      return;
    }

    if (!guardSubmit(trigger)) return;

    if (trigger.hasAttribute('data-toast')) {
      showToast(trigger.getAttribute('data-toast'));
    }

    var targetId = trigger.getAttribute('data-go');
    if (targetId) {
      window.setTimeout(function () {
        showView(targetId);
      }, trigger.hasAttribute('data-toast') ? 180 : 0);
    }
  });

  /* ---------- 启动 ---------- */

  function applyDeepLink() {
    var screen = new URLSearchParams(window.location.search).get('screen');
    if (screen) showView(screen, false);
  }

  document.addEventListener('DOMContentLoaded', function () {
    renderTabBars();
    renderHourMarks();
    renderTimetable();
    renderSemesterChart();
    applyDeepLink();

    app.querySelectorAll('.note-textarea').forEach(bindFieldEvents);
    loadTaskList();
  });

})();
