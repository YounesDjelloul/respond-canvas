import { createRouter, createWebHistory } from 'vue-router'
import { reportApplicationError } from './report-application-error'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'workflow',
      component: () => import('@/features/workflow/components/WorkflowPage.vue'),
    },
    {
      path: '/nodes/:nodeId',
      name: 'workflow-node',
      component: () => import('@/features/workflow/components/WorkflowPage.vue'),
    },
  ],
})

router.onError((error, to) => {
  reportApplicationError(error, `router:${to.fullPath}`)
})
