<script setup lang="ts">
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { useWorkflowEditorContext } from '../composables/workflow-editor-context'

const {
  deletion: {
    isOpen,
    title,
    message,
    errorMessage,
    isDeleting,
    confirmLabel,
    confirm,
    setVisibility,
  },
} = useWorkflowEditorContext()
</script>

<template>
  <AlertDialog :open="isOpen" @update:open="setVisibility">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{{ title }}</AlertDialogTitle>
        <AlertDialogDescription>{{ message }}</AlertDialogDescription>
      </AlertDialogHeader>

      <p
        v-if="errorMessage"
        role="alert"
        class="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700"
      >
        {{ errorMessage }}
      </p>

      <AlertDialogFooter>
        <AlertDialogCancel :disabled="isDeleting">Cancel</AlertDialogCancel>
        <Button
          type="button"
          variant="destructive"
          :disabled="isDeleting"
          @click="confirm"
        >
          {{ confirmLabel }}
        </Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
