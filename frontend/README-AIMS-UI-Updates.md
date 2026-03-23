# AIMS UI Updates for Weighted Calculation

## Changes Needed for Indicator 4 Support

### 1. Update DynamicForm Component
Location: `frontend/src/components/forms/DynamicForm.tsx`

Add support for "calculated" field type:
```typescript
// In the field rendering switch statement, add:
case 'calculated':
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {field.label}
      </label>
      <input
        type="text"
        value={calculateValue(formData, field.formula)}
        readOnly
        className="w-full px-3 py-2 border border-gray-300 bg-gray-50 rounded-md"
      />
      {field.description && (
        <p className="mt-1 text-sm text-gray-500">{field.description}</p>
      )}
    </div>
  );