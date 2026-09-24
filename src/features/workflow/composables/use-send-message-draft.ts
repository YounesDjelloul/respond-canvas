import { computed, ref } from 'vue'
import type {
  WorkflowAttachmentPart,
  WorkflowMessagePart,
  WorkflowNode,
} from '../domain'
import { validateWorkflowAttachment } from '../domain'
import type { WorkflowMessageDraftItem } from '../types'

export function useSendMessageDraft(clearErrors: () => void) {
  const parts = ref<WorkflowMessagePart[]>([])
  const attachmentError = ref<string | null>(null)
  const items = computed<WorkflowMessageDraftItem[]>(() =>
    parts.value.map((part, index) => ({
      index,
      type: part.type,
      value: part.value,
      name: part.type === 'attachment' ? part.name ?? attachmentName(part.value) : '',
      extension:
        part.type === 'attachment'
          ? fileExtension(part.name ?? attachmentName(part.value))
          : '',
      label:
        part.type === 'text'
          ? `Text ${textPosition(parts.value, index)}`
          : part.name ?? attachmentName(part.value),
      isImage:
        part.type === 'attachment' &&
        (part.mimeType?.startsWith('image/') === true || isImageUrl(part.value)),
      error: null,
    })),
  )

  function reset(node: WorkflowNode | null) {
    parts.value =
      node?.kind === 'send-message'
        ? node.config.parts.map((part) => ({ ...part }))
        : []
    attachmentError.value = null
  }

  function hasChanges(node: WorkflowNode): boolean {
    return (
      node.kind === 'send-message' && !haveSameParts(node.config.parts, parts.value)
    )
  }

  function addText() {
    parts.value = [...parts.value, { type: 'text', value: '' }]
    clearErrors()
  }

  function updateText(index: number, value: string) {
    parts.value = parts.value.map((part, partIndex) =>
      partIndex === index && part.type === 'text' ? { ...part, value } : part,
    )
    clearErrors()
  }

  function removePart(index: number) {
    parts.value = parts.value.filter((_, partIndex) => partIndex !== index)
    clearErrors()
  }

  async function addAttachments(files: FileList | null) {
    if (!files?.length) {
      return
    }

    attachmentError.value = null
    const acceptedFiles = Array.from(files).filter((file) => {
      const result = validateWorkflowAttachment({
        name: file.name,
        size: file.size,
      })

      if (result.ok) {
        return true
      }

      attachmentError.value =
        result.errors[0]?.message ?? `${file.name} could not be attached`
      return false
    })

    try {
      const attachments = await Promise.all(
        acceptedFiles.map(async (file): Promise<WorkflowAttachmentPart> => ({
          type: 'attachment',
          value: await readFileAsDataUrl(file),
          name: file.name,
          mimeType: file.type,
        })),
      )

      parts.value = [...parts.value, ...attachments]
      clearErrors()
    } catch (error) {
      attachmentError.value =
        error instanceof Error ? error.message : 'The attachment could not be read'
    }
  }

  return {
    parts,
    items,
    attachmentError,
    reset,
    hasChanges,
    addText,
    updateText,
    removePart,
    addAttachments,
  }
}

function fileExtension(name: string): string {
  const extension = name.includes('.') ? name.split('.').at(-1) : undefined

  return extension ? extension.slice(0, 4) : 'File'
}

function haveSameParts(
  saved: readonly WorkflowMessagePart[],
  draft: readonly WorkflowMessagePart[],
): boolean {
  return (
    saved.length === draft.length &&
    saved.every((part, index) => {
      const draftPart = draft[index]

      if (!draftPart || part.type !== draftPart.type || part.value !== draftPart.value) {
        return false
      }

      return (
        part.type !== 'attachment' ||
        draftPart.type !== 'attachment' ||
        (part.name === draftPart.name && part.mimeType === draftPart.mimeType)
      )
    })
  )
}

function textPosition(parts: readonly WorkflowMessagePart[], index: number): number {
  return parts.slice(0, index + 1).filter((part) => part.type === 'text').length
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.addEventListener('load', () => resolve(String(reader.result)))
    reader.addEventListener('error', () => reject(new Error(`${file.name} could not be read`)))
    reader.readAsDataURL(file)
  })
}

function isImageUrl(value: string): boolean {
  return (
    value.startsWith('data:image/') ||
    /\.(avif|gif|jpe?g|png|webp)(?:\?.*)?$/i.test(value)
  )
}

function attachmentName(value: string): string {
  try {
    const pathname = new URL(value).pathname
    return pathname.split('/').filter(Boolean).at(-1) ?? 'Attachment'
  } catch {
    return 'Attachment'
  }
}
