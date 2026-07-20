<script lang="ts" setup>
import type { VbenFormSchema } from '@vben/common-ui';

import { computed } from 'vue';

import { AuthenticationLogin, z } from '@vben/common-ui';

import { useAuthStore } from '#/store';

defineOptions({ name: 'Login' });

const authStore = useAuthStore();

const formSchema = computed((): VbenFormSchema[] => [
  {
    component: 'VbenInput',
    componentProps: {
      autocomplete: 'email',
      placeholder: 'seuemail@empresa.com.br',
    },
    fieldName: 'username',
    label: 'E-mail',
    rules: z
      .string()
      .min(1, { message: 'Informe seu e-mail.' })
      .email({ message: 'Informe um e-mail válido.' }),
  },
  {
    component: 'VbenInputPassword',
    componentProps: {
      autocomplete: 'current-password',
      placeholder: 'Sua senha',
    },
    fieldName: 'password',
    label: 'Senha',
    rules: z.string().min(1, { message: 'Informe sua senha.' }),
  },
]);
</script>

<template>
  <AuthenticationLogin
    :form-schema="formSchema"
    :loading="authStore.loginLoading"
    @submit="authStore.authLogin"
  />
</template>
