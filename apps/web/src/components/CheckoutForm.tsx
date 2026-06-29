"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useUserStore } from "../stores/useUserStore";
import { api } from "../lib/api";

const CHECKOUT_AMOUNT = 50;

export function CheckoutForm() {
  const queryClient = useQueryClient();
  const { balance, setBalance } = useUserStore();

  const mutation = useMutation({
    mutationFn: () => api.post<{ success: boolean; newBalance: number }>("/api/checkout", {}),

    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["balance"] });

      const previousBalance = queryClient.getQueryData<{ amount: number }>(["balance"]);
      const previousStoreBalance = useUserStore.getState().balance;

      queryClient.setQueryData(["balance"], {
        amount: (previousBalance?.amount ?? previousStoreBalance ?? 0) - CHECKOUT_AMOUNT,
      });

      setBalance((previousStoreBalance ?? 0) - CHECKOUT_AMOUNT);

      return { previousBalance, previousStoreBalance };
    },

    onError: (_err, _vars, context) => {
      queryClient.setQueryData(["balance"], context?.previousBalance);

      if (typeof context?.previousStoreBalance === "number") {
        setBalance(context.previousStoreBalance);
      }
    },

    onSuccess: (data) => {
      queryClient.setQueryData(["balance"], { amount: data.newBalance });
      useUserStore.getState().setBalance(data.newBalance);
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });

  const canCheckout = (balance ?? 0) >= CHECKOUT_AMOUNT;

  return (
    <div className="bg-white rounded-xl shadow p-6 max-w-sm mx-auto">
      <h2 className="text-lg font-semibold text-gray-800 mb-2">Finalizar Compra</h2>

      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>Produto</span>
          <span>Assinatura Premium</span>
        </div>
        <div className="flex justify-between font-semibold text-gray-800">
          <span>Total</span>
          <span>R$ {CHECKOUT_AMOUNT.toFixed(2)}</span>
        </div>
      </div>

      <div className="mb-4 text-sm text-gray-600">
        Saldo atual:{" "}
        <span className={`font-semibold ${(balance ?? 0) < CHECKOUT_AMOUNT ? "text-red-600" : "text-gray-800"}`}>
          R$ {(balance ?? 0).toFixed(2)}
        </span>
      </div>

      {mutation.isError && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {(mutation.error as Error).message}
        </div>
      )}

      {mutation.isSuccess && (
        <div className="mb-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
          Pagamento realizado! Novo saldo: R$ {mutation.data.newBalance.toFixed(2)}
        </div>
      )}

      <button
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending || !canCheckout}
        className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 rounded-lg text-sm disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {mutation.isPending ? "Processando..." : canCheckout ? "Pagar R$ 50,00" : "Saldo insuficiente"}
      </button>
    </div>
  );
}
