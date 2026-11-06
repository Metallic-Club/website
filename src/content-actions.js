import {escapeHtml as esc} from './store.js';
import {reportReasons, reportLimit} from './content-reports.js';

export function createContentActions(ctx) {
  const {button, icon, dialog, modal, toast, state, target, save} = ctx;
  const popup = document.createElement('div');
  popup.id = 'content-actions';
  popup.setAttribute('popover', 'manual');
  popup.setAttribute('role', 'group');
  document.body.append(popup);
  let anchor, pendingReport;

  function trigger(kind, id, name, position = '') {
    return button('content-actions', icon('more', 19), 'content-actions-trigger ' + position,
      `data-id="${esc(id)}" data-value="${kind}" aria-label="More actions for ${esc(name)}" aria-expanded="false" aria-controls="${popup.id}"`);
  }

  function close(restore = false) {
    if (!anchor) return;
    const previous = anchor;
    anchor = null;
    popup.hidePopover();
    previous.setAttribute('aria-expanded', 'false');
    if (restore && previous.isConnected) previous.focus({preventScroll: true});
  }

  function toggle(trigger) {
    if (trigger === anchor) return close(true);
    close();
    const {value: kind, id} = trigger.dataset;
    const item = target(kind, id);
    if (!item) return;
    const reported = state().reports.some(report => report.kind === kind && report.id === id);
    const common = `data-value="${kind}" data-id="${esc(id)}"`;
    const options = [
      ...item.actions.map(({action, label, glyph, extra, href}) => href
        ? `<a href="#/${esc(href)}">${icon(glyph, 16)}${label}</a>`
        : button(action, icon(glyph, 16) + label, '', extra)),
      item.path && button('content-share', icon('share', 16) + 'Share ' + kind, '', common),
      item.report && button('content-report', icon('flag', 16) + (reported ? 'Report saved' : 'Report ' + kind),
        'content-report', common + (reported ? ' disabled' : '')),
    ];
    popup.setAttribute('aria-label', 'Actions for ' + item.name);
    popup.innerHTML = options.filter(Boolean).join('');
    anchor = trigger;
    trigger.setAttribute('aria-expanded', 'true');
    popup.showPopover();
    const rect = trigger.getBoundingClientRect(), gap = 6;
    const {offsetWidth: width, offsetHeight: height} = popup;
    popup.style.left = Math.max(gap, Math.min(rect.right - width, document.documentElement.clientWidth - width - gap)) + 'px';
    const viewportHeight = document.documentElement.clientHeight;
    const top = rect.bottom + height + gap * 2 <= viewportHeight ? rect.bottom + gap : rect.top - height - gap;
    popup.style.top = Math.max(gap, Math.min(top, viewportHeight - height - gap)) + 'px';
    popup.querySelector('button:not(:disabled),a')?.focus({preventScroll: true});
  }

  document.addEventListener('pointerdown', event => {
    if (anchor && !anchor.contains(event.target) && !popup.contains(event.target)) close();
  });
  document.addEventListener('focusin', event => {
    if (anchor && !anchor.contains(event.target) && !popup.contains(event.target)) close();
  });
  document.addEventListener('click', event => {
    if (popup.contains(event.target) && event.target.closest('a,button:not(:disabled)')) close(true);
  });
  document.addEventListener('keydown', event => {
    if (!anchor) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      close(true);
      event.stopImmediatePropagation();
      return;
    }
    const controls = [...popup.querySelectorAll('button:not(:disabled),a')];
    const index = controls.indexOf(document.activeElement);
    if (event.key === 'Tab' && (event.shiftKey ? index <= 0 : index === controls.length - 1)) close(true);
    if (['ArrowDown', 'ArrowUp'].includes(event.key) && index >= 0) {
      event.preventDefault();
      controls[(index + (event.key === 'ArrowDown' ? 1 : -1) + controls.length) % controls.length].focus();
    }
  }, true);
  document.addEventListener('scroll', event => { if (!popup.contains(event.target)) close(true); }, true);
  window.addEventListener('resize', () => close(true));

  async function handleAction(action, element) {
    if (action === 'content-actions') return toggle(element);
    const {value: kind, id} = element.dataset;
    const item = target(kind, id);
    if (!item) return;
    if (action === 'content-share' && item.path) {
      const url = new URL(location.href);
      url.hash = '/' + item.path;
      try {
        await navigator.clipboard.writeText(url.href);
        toast('Link copied.');
      } catch {
        modal('Share ' + kind, `<label for="share-url">Link to ${esc(item.name)}</label><input id="share-url" class="share-url" readonly value="${esc(url.href)}">`);
        document.querySelector('#share-url').select();
      }
    }
    if (action === 'content-report' && item.report) {
      pendingReport = {kind, id};
      modal('Report ' + kind, `<form id="content-report-form"><p>${esc(item.name)}</p>
        <label for="report-reason">Reason</label><select id="report-reason" name="reason" required><option value="">Choose a reason</option>${reportReasons.map(reason => `<option>${reason}</option>`).join('')}</select>
        <p class="fine-print">Preview reports are saved in this browser.</p><p class="form-error" role="alert"></p>
        <div class="button-row">${button('close-dialog', 'Cancel')}<button type="submit" class="button primary">Save preview report</button></div></form>`);
    }
  }

  function submit(form) {
    if (form.id !== 'content-report-form') return false;
    if (!pendingReport || !target(pendingReport.kind, pendingReport.id)?.report) return true;
    const reason = new FormData(form).get('reason');
    if (!reportReasons.includes(reason)) return true;
    const current = state(), previous = current.reports;
    const {kind, id} = pendingReport;
    if (!previous.some(report => report.kind === kind && report.id === id)) {
      current.reports = [{kind, id, reason}, ...previous].slice(0, reportLimit);
      if (!save()) {
        current.reports = previous;
        form.querySelector('.form-error').textContent = 'The report could not be saved. Try again when browser storage is available.';
        return true;
      }
    }
    pendingReport = null;
    dialog.close();
    toast('Preview report saved.');
    return true;
  }

  return {trigger, close, handleAction, submit};
}
