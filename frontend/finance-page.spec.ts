import { test, expect, APIRequestContext, Page, Download } from '@playwright/test';
const baseURL = process.env.SMS_BASE_URL || 'http://localhost:3000';
const apiURL = process.env.SMS_API_URL || 'http://localhost:5000';
const password = process.env.SMS_TEST_PASSWORD || 'admin123';

type BrowserAuth = {
  access_token: string;
  user: {
    id: string;
    email: string;
    username: string;
    name: string;
    role: string;
    schoolId: string;
    calendarType?: string;
    theme?: string;
    permissions?: string[];
  };
};

async function login(request: APIRequestContext, loginIdentifier: string) {
  const response = await request.post(`${apiURL}/auth/login`, {
    data: { loginIdentifier, password },
  });
  expect(
    response.ok(),
    `${loginIdentifier} login failed: ${await response.text()}`,
  ).toBeTruthy();
  return (await response.json()) as BrowserAuth;
}

async function installAuth(page: Page, auth: BrowserAuth) {
  await page.goto(baseURL);
  await page.evaluate(
    ({ token, user }) => {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
    },
    { token: auth.access_token, user: auth.user },
  );
}

async function apiGet(request: APIRequestContext, token: string, path: string) {
  const response = await request.get(`${apiURL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(response.ok(), `${path} failed: ${await response.text()}`).toBeTruthy();
  return response.json();
}

async function pickTerm(page: Page, termName: string) {
  const triggers = page.locator('button[role="combobox"]');
  await triggers.nth(1).click();
  await page.getByRole('option', { name: termName, exact: true }).click();
}

async function pickDialogTerm(page: Page, termName: string) {
  const dialog = page.getByRole('dialog');
  const trigger = dialog.locator('button[role="combobox"]').first();
  await trigger.click();
  await page.getByRole('option', { name: termName, exact: true }).click();
}

async function waitForDownload(action: Promise<void>, page: Page): Promise<Download> {
  const [download] = await Promise.all([page.waitForEvent('download'), action]);
  return download;
}

test('finance page flows work in browser with live data', async ({ page, request }) => {
  test.setTimeout(120000);

  const auth = await login(
    request,
    process.env.SMS_TEST_ADMIN_LOGIN || 'admin001',
  );
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') pageErrors.push(message.text());
  });

  const years = await apiGet(request, auth.access_token, '/academic-years');
  const schoolYears = Array.isArray(years)
    ? years.filter((year: any) => year.schoolId === auth.user.schoolId)
    : [];
  const activeYear =
    schoolYears.find((year: any) => year.isActive) ?? schoolYears[0];
  expect(activeYear, 'active academic year').toBeTruthy();

  const terms = Array.isArray(activeYear.terms) ? activeYear.terms : [];
  const term =
    terms.find((item: any) => item.isActive) ??
    terms[0];
  expect(term, 'active term').toBeTruthy();

  const outstanding = await apiGet(
    request,
    auth.access_token,
    `/finance/reports/outstanding?schoolId=${auth.user.schoolId}&academicYearId=${activeYear.id}&termId=${term.id}`,
  );
  const outstandingRows = Array.isArray(outstanding?.rows) ? outstanding.rows : [];
  const payableRow = outstandingRows.find(
    (row: any) => Number(row.remaining || 0) > 0 && row.studentId,
  );

  await installAuth(page, auth);
  await page.goto(`${baseURL}/finance`, { waitUntil: 'domcontentloaded' });
  console.log('finance: page loaded');

  await expect(page.getByRole('button', { name: 'Record Payment' })).toBeVisible();
  await expect(page.getByText('Fee Structures', { exact: true })).toBeVisible();
  await expect(page.getByText('Recent Transactions', { exact: true })).toBeVisible();
  await expect(page.getByText('Outstanding Fees', { exact: true })).toBeVisible();
  console.log('finance: primary sections visible');

  await pickTerm(page, term.name);
  await expect(page.getByText('Outstanding Fees')).toBeVisible();
  console.log('finance: term selected', term.name);

  await page.getByRole('tab', { name: 'Weekly' }).click();
  await expect(page.getByRole('tab', { name: 'Weekly' })).toHaveAttribute(
    'data-state',
    'active',
  );
  await page.getByRole('tab', { name: 'Monthly' }).click();
  await expect(page.getByRole('tab', { name: 'Monthly' })).toHaveAttribute(
    'data-state',
    'active',
  );
  await page.getByRole('tab', { name: 'Daily' }).click();
  console.log('finance: chart tabs switched');

  const download = await Promise.race([
    waitForDownload(page.getByRole('button', { name: 'Export' }).click(), page),
    page.waitForTimeout(5000).then(() => null),
  ]);
  expect(download, 'export should trigger a file download').toBeTruthy();
  expect(await download!.suggestedFilename()).toMatch(/^finance_summary_/);
  console.log('finance: export triggered');

  await page.getByRole('button', { name: 'Fee Structure' }).click();
  await expect(page.getByRole('dialog')).toContainText('Create Fee Structure');
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  console.log('finance: fee structure dialog open-close works');

  await page.getByPlaceholder('Search student...').fill('zzzz-no-match');
  await expect(page.getByText('No matching fees found')).toBeVisible();
  await page.getByPlaceholder('Search student...').fill('');

  await page.getByRole('button', { name: 'Paid', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Paid', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Partial', exact: true }).click();
  await page.getByRole('button', { name: 'Unpaid', exact: true }).click();
  await page.getByRole('button', { name: 'All', exact: true }).click();
  console.log('finance: outstanding filters switched');

  await page.getByRole('button', { name: 'Record Payment' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('Record Payment');
  await pickDialogTerm(page, term.name);
  console.log('finance: record payment dialog opened');

  if (payableRow) {
    const paymentHistoryBefore = await apiGet(
      request,
      auth.access_token,
      `/finance/reports/student/${payableRow.studentId}/history?schoolId=${auth.user.schoolId}`,
    );
    const transactionsBefore = Array.isArray(paymentHistoryBefore?.payments)
      ? paymentHistoryBefore.payments.length
      : 0;

    const searchInput = dialog.getByPlaceholder('Type name or student ID...');
    await searchInput.fill(String(payableRow.studentName || '').slice(0, 4));
    await expect(dialog.getByText(payableRow.studentName, { exact: false })).toBeVisible({
      timeout: 15000,
    });
    await dialog
      .getByText(payableRow.studentName, { exact: false })
      .first()
      .click();
    console.log('finance: student selected', payableRow.studentName);

    await expect(dialog.getByText('Fee Item')).toBeVisible();
    await expect(dialog.getByText(/Remaining balance:/i)).toBeVisible();
    console.log('finance: fee item visible');

    const amountInput = dialog.getByPlaceholder('0.00');
    await amountInput.fill('1');
    await dialog.getByRole('button', { name: 'Record Payment' }).click();
    await expect(page.getByText('Payment recorded successfully')).toBeVisible({
      timeout: 20000,
    });
    await expect(dialog).toBeHidden();
    console.log('finance: payment recorded');

    await expect(page.getByText(payableRow.studentName, { exact: false }).first()).toBeVisible({
      timeout: 20000,
    });

    const paymentHistoryAfter = await apiGet(
      request,
      auth.access_token,
      `/finance/reports/student/${payableRow.studentId}/history?schoolId=${auth.user.schoolId}`,
    );
    const transactionsAfter = Array.isArray(paymentHistoryAfter?.payments)
      ? paymentHistoryAfter.payments.length
      : 0;
    expect(transactionsAfter).toBeGreaterThan(transactionsBefore);

    await page.getByPlaceholder('Search...').fill(payableRow.studentName);
    const row = page
      .locator('tr')
      .filter({ hasText: payableRow.studentName })
      .first();
    await expect(row).toContainText('1.00');
    await row.getByRole('button', { name: 'Reverse' }).click();
    await page.getByRole('button', { name: 'Reverse' }).last().click();
    await expect(page.getByText('Payment reversed and balance recalculated')).toBeVisible({
      timeout: 20000,
    });
    console.log('finance: payment reversed');
  } else {
    await expect(dialog.getByText('Search Student')).toBeVisible();
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    console.log('finance: no payable row available');
  }

  const relevantErrors = pageErrors.filter(
    (error) =>
      !/favicon|_next\/static|_next\/image|ResizeObserver loop limit exceeded/i.test(
        error,
      ),
  );
  expect(relevantErrors, 'finance page browser errors').toEqual([]);
});
