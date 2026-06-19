import { DynamicForm } from './DynamicForm';
import { LimitationsForm } from './LimitationsForm';
import { CALCULATOR_FORMS } from '../calc-config';

// Maps a tab id -> rendered form. Calculator tabs are built generically from
// their schema in calc-config (CALCULATOR_FORMS). The "Ограничения" tab is a
// static text form instead of a schema-driven one.
export function CalculatorForm({ tabId }) {
  if (tabId === 'limitations') {
    return <LimitationsForm />;
  }

  const config = CALCULATOR_FORMS[tabId] ?? CALCULATOR_FORMS.smd;
  return <DynamicForm config={config} formId={tabId} />;
}
