export const waitForElementByText = async (page, text, options) => {
  const selector = `//*[contains(text(), '${text}')]`;
  return page.waitForXPath(selector, options);
};
