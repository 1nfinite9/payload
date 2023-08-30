import i18next, { type i18n } from 'i18next'
import { useTranslation } from 'react-i18next'

import type { SanitizedCollectionConfig } from '../../collections/config/types.js'
import type { SanitizedConfig } from '../../config/types.js'
import type { FormField } from '../components/forms/Form/types.js'

import { getObjectDotNotation } from '../../utilities/getObjectDotNotation.js'
import { useFormFields } from '../components/forms/Form/context.js'
import { useConfig } from '../components/utilities/Config/index.js'
import { formatDate } from '../utilities/formatDate/index.js'

// either send the `useAsTitle` field itself
// or an object to dynamically extract the `useAsTitle` field from
export const formatUseAsTitle = (args: {
  collection: SanitizedCollectionConfig
  config: SanitizedConfig
  doc?: Record<string, any>
  field?: FormField
  i18n: i18n
}): string => {
  const {
    collection: {
      admin: { useAsTitle },
    },
    collection,
    config: {
      admin: { dateFormat: dateFormatFromConfig },
    },
    doc,
    field: fieldFromProps,
    i18n,
  } = args

  if (!fieldFromProps && !doc) {
    return ''
  }

  const field = fieldFromProps || getObjectDotNotation<FormField>(doc, collection.admin.useAsTitle)

  let title = typeof field === 'string' ? field : (field?.value as string)

  const fieldConfig = collection?.fields?.find((f) => 'name' in f && f?.name === useAsTitle)
  const isDate = fieldConfig?.type === 'date'

  if (title && isDate) {
    const dateFormat = fieldConfig?.admin?.date?.displayFormat || dateFormatFromConfig
    title = formatDate(title, dateFormat, i18n?.language)
  }

  return title
}

const useTitle = (collection: SanitizedCollectionConfig): string => {
  const { i18n } = useTranslation()
  const field = useFormFields(([formFields]) => formFields[collection?.admin?.useAsTitle])
  const config = useConfig()

  return formatUseAsTitle({ collection, config, field, i18n })
}

export default useTitle