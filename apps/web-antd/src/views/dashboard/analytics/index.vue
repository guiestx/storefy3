<script lang="ts" setup>
import type { TableColumnsType } from 'ant-design-vue';

import { onMounted, reactive, ref } from 'vue';

import {
  Alert,
  Button,
  Card,
  Col,
  Row,
  Space,
  Spin,
  Statistic,
  Table,
  Tag,
} from 'ant-design-vue';
import dayjs from 'dayjs';

import { getCurrentOrganizationId, supabase } from '#/lib/supabase';

defineOptions({ name: 'StorefyOverview' });

const loading = ref(true);
const errorMessage = ref('');
const organizationName = ref('Storefy');
const orders = ref<any[]>([]);
const activities = ref<any[]>([]);

const stats = reactive({
  available: 0,
  grossSales: 0,
  orders: 0,
  products: 0,
  reserved: 0,
});

const orderColumns: TableColumnsType = [
  { dataIndex: 'code', key: 'code', title: 'Pedido', width: 160 },
  { dataIndex: 'status', key: 'status', title: 'Status', width: 150 },
  {
    dataIndex: 'payment_status',
    key: 'payment_status',
    title: 'Pagamento',
    width: 140,
  },
  { dataIndex: 'channel', key: 'channel', title: 'Canal', width: 100 },
  { dataIndex: 'total', key: 'total', title: 'Total', width: 140 },
  { dataIndex: 'created_at', key: 'created_at', title: 'Criado em', width: 170 },
];

function formatMoney(value: number | string | null | undefined) {
  return new Intl.NumberFormat('pt-BR', {
    currency: 'BRL',
    style: 'currency',
  }).format(Number(value ?? 0));
}

function statusColor(status?: string) {
  const colors: Record<string, string> = {
    awaiting_payment: 'orange',
    cancelled: 'red',
    done: 'green',
    paid: 'green',
    pending: 'orange',
    picking: 'blue',
    reserved: 'geekblue',
    shipped: 'cyan',
  };
  return colors[status ?? ''] ?? 'default';
}

function statusLabel(status?: string) {
  const labels: Record<string, string> = {
    awaiting_payment: 'Aguardando pagamento',
    cancelled: 'Cancelado',
    done: 'Concluído',
    paid: 'Pago',
    pending: 'Pendente',
    picking: 'Separação',
    reserved: 'Reservado',
    shipped: 'Enviado',
  };
  return labels[status ?? ''] ?? status ?? '—';
}

async function loadDashboard() {
  loading.value = true;
  errorMessage.value = '';

  try {
    const organizationId = await getCurrentOrganizationId();

    const [organizationResult, productResult, orderResult, inventoryResult, recentResult, activityResult] =
      await Promise.all([
        supabase
          .from('organizations')
          .select('name')
          .eq('id', organizationId)
          .single(),
        supabase
          .from('products')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', organizationId),
        supabase
          .from('sales_orders')
          .select('id,total', { count: 'exact' })
          .eq('organization_id', organizationId),
        supabase
          .from('inventory_balances')
          .select('on_hand,reserved,available')
          .eq('organization_id', organizationId),
        supabase
          .from('sales_orders')
          .select('id,code,status,payment_status,channel,total,created_at')
          .eq('organization_id', organizationId)
          .order('created_at', { ascending: false })
          .limit(8),
        supabase
          .from('activity_events')
          .select('id,module,action,summary,actor_email,created_at')
          .eq('organization_id', organizationId)
          .order('created_at', { ascending: false })
          .limit(8),
      ]);

    const firstError = [
      organizationResult.error,
      productResult.error,
      orderResult.error,
      inventoryResult.error,
      recentResult.error,
      activityResult.error,
    ].find(Boolean);
    if (firstError) throw firstError;

    organizationName.value = organizationResult.data?.name ?? 'Storefy';
    stats.products = productResult.count ?? 0;
    stats.orders = orderResult.count ?? 0;
    stats.grossSales = (orderResult.data ?? []).reduce(
      (total, item) => total + Number(item.total ?? 0),
      0,
    );
    stats.available = (inventoryResult.data ?? []).reduce(
      (total, item) => total + Number(item.available ?? 0),
      0,
    );
    stats.reserved = (inventoryResult.data ?? []).reduce(
      (total, item) => total + Number(item.reserved ?? 0),
      0,
    );
    orders.value = recentResult.data ?? [];
    activities.value = activityResult.data ?? [];
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : 'Não foi possível carregar o painel.';
  } finally {
    loading.value = false;
  }
}

onMounted(loadDashboard);
</script>

<template>
  <div class="p-4 md:p-5">
    <div class="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight">{{ organizationName }}</h1>
        <p class="mt-1 text-sm text-muted-foreground">
          Visão consolidada de vendas, catálogo e estoque.
        </p>
      </div>
      <Button :loading="loading" @click="loadDashboard">Atualizar</Button>
    </div>

    <Alert
      v-if="errorMessage"
      class="mb-4"
      closable
      message="Falha ao consultar o Supabase"
      :description="errorMessage"
      type="error"
    />

    <Spin :spinning="loading">
      <Row :gutter="[16, 16]">
        <Col :xs="24" :sm="12" :xl="6">
          <Card :bordered="false">
            <Statistic title="Produtos cadastrados" :value="stats.products" />
          </Card>
        </Col>
        <Col :xs="24" :sm="12" :xl="6">
          <Card :bordered="false">
            <Statistic title="Pedidos" :value="stats.orders" />
          </Card>
        </Col>
        <Col :xs="24" :sm="12" :xl="6">
          <Card :bordered="false">
            <Statistic
              title="Vendas registradas"
              :value="stats.grossSales"
              :precision="2"
              prefix="R$"
            />
          </Card>
        </Col>
        <Col :xs="24" :sm="12" :xl="6">
          <Card :bordered="false">
            <Statistic
              title="Estoque disponível"
              :value="stats.available"
              :suffix="`${stats.reserved} reservadas`"
            />
          </Card>
        </Col>
      </Row>

      <Row :gutter="[16, 16]" class="mt-4">
        <Col :xs="24" :xl="16">
          <Card title="Pedidos recentes" :bordered="false">
            <Table
              :columns="orderColumns"
              :data-source="orders"
              :pagination="false"
              row-key="id"
              :scroll="{ x: 860 }"
              size="middle"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'code'">
                  <span class="font-mono font-medium">{{ record.code || record.id }}</span>
                </template>
                <template v-else-if="column.key === 'status'">
                  <Tag :color="statusColor(record.status)">
                    {{ statusLabel(record.status) }}
                  </Tag>
                </template>
                <template v-else-if="column.key === 'payment_status'">
                  <Tag :color="statusColor(record.payment_status)">
                    {{ statusLabel(record.payment_status) }}
                  </Tag>
                </template>
                <template v-else-if="column.key === 'total'">
                  <strong>{{ formatMoney(record.total) }}</strong>
                </template>
                <template v-else-if="column.key === 'created_at'">
                  {{ dayjs(record.created_at).format('DD/MM/YYYY HH:mm') }}
                </template>
              </template>
            </Table>
          </Card>
        </Col>

        <Col :xs="24" :xl="8">
          <Card title="Atividade operacional" :bordered="false">
            <Space v-if="activities.length" direction="vertical" class="w-full" :size="16">
              <div
                v-for="activity in activities"
                :key="activity.id"
                class="border-b border-border pb-3 last:border-0 last:pb-0"
              >
                <div class="flex items-center justify-between gap-3">
                  <Tag>{{ activity.module || activity.action }}</Tag>
                  <span class="text-xs text-muted-foreground">
                    {{ dayjs(activity.created_at).format('DD/MM HH:mm') }}
                  </span>
                </div>
                <p class="mt-2 text-sm leading-5">{{ activity.summary || activity.action }}</p>
                <p v-if="activity.actor_email" class="mt-1 text-xs text-muted-foreground">
                  {{ activity.actor_email }}
                </p>
              </div>
            </Space>
            <p v-else class="py-10 text-center text-sm text-muted-foreground">
              Nenhuma atividade registrada.
            </p>
          </Card>
        </Col>
      </Row>
    </Spin>
  </div>
</template>
