export function setupContactForm(form, endpoint) {
  if (!/^https:\/\/formspree\.io\/f\/[a-zA-Z0-9]+$/.test(endpoint)) throw new Error('Missing verified Formspree endpoint');
  form.action = endpoint;
  const status = document.createElement('p');
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  form.append(status);
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const button = form.querySelector('[type="submit"]');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    button.disabled = true;
    button.textContent = 'Sending… / 正在发送';
    status.textContent = '';
    status.style.color = '';
    form.setAttribute('aria-busy', 'true');
    try {
      const response = await fetch(endpoint, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' }, signal: controller.signal });
      if (!response.ok) throw new Error('Submission failed');
      status.textContent = 'Message submitted. Thank you! / 留言已提交，谢谢！';
      form.reset();
    } catch {
      status.style.color = '#ff7979';
      status.textContent = 'Unable to confirm submission. Your message is still here. Please retry or email zhaoyangdai1104@gmail.com. / 暂时无法确认发送结果，填写内容已保留。请重试或直接发送邮件。';
    } finally {
      clearTimeout(timer);
      form.removeAttribute('aria-busy');
      button.disabled = false;
      button.textContent = 'Send message / 发送留言';
    }
  });
}
