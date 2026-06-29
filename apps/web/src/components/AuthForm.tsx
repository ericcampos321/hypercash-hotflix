"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { useUserStore } from "../stores/useUserStore";

type Tab = "login" | "register";

const loginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(1, "Senha obrigatória"),
});

const registerSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
});

type LoginData = z.infer<typeof loginSchema>;
type RegisterData = z.infer<typeof registerSchema>;

export function AuthForm() {
  const [tab, setTab] = useState<Tab>("login");
  const { login, register } = useUserStore();
  const router = useRouter();

  const loginForm = useForm<LoginData>({ resolver: zodResolver(loginSchema) });
  const registerForm = useForm<RegisterData>({ resolver: zodResolver(registerSchema) });

  async function handleLogin(data: LoginData) {
    try {
      await login(data.email, data.password);
      router.push("/dashboard");
    } catch (err: any) {
      loginForm.setError("root", { message: err.message || "Erro ao fazer login" });
    }
  }

  async function handleRegister(data: RegisterData) {
    try {
      await register(data);
      router.push("/dashboard");
    } catch (err: any) {
      registerForm.setError("root", { message: err.message || "Erro ao criar conta" });
    }
  }

  function switchTab(newTab: Tab) {
    setTab(newTab);
    loginForm.clearErrors();
    registerForm.clearErrors();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-center text-gray-800 mb-6">HyperCash</h1>

        <div className="flex border-b mb-6">
          <button
            className={`flex-1 py-2 text-sm font-medium ${tab === "login" ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-500"}`}
            onClick={() => switchTab("login")}
          >
            Entrar
          </button>
          <button
            className={`flex-1 py-2 text-sm font-medium ${
              tab === "register" ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-500"
            }`}
            onClick={() => switchTab("register")}
          >
            Criar conta
          </button>
        </div>

        {tab === "login" ? (
          <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
            {loginForm.formState.errors.root && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {loginForm.formState.errors.root.message}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
              <input
                type="email"
                {...loginForm.register("email")}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="seu@email.com"
              />
              {loginForm.formState.errors.email && <p className="mt-1 text-xs text-red-600">{loginForm.formState.errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
              <input
                type="password"
                {...loginForm.register("password")}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
              />
              {loginForm.formState.errors.password && (
                <p className="mt-1 text-xs text-red-600">{loginForm.formState.errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loginForm.formState.isSubmitting}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg text-sm disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loginForm.formState.isSubmitting ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Entrando...
                </>
              ) : (
                "Entrar"
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-4">
            {registerForm.formState.errors.root && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {registerForm.formState.errors.root.message}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
              <input
                type="text"
                {...registerForm.register("name")}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Seu nome"
              />
              {registerForm.formState.errors.name && (
                <p className="mt-1 text-xs text-red-600">{registerForm.formState.errors.name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
              <input
                type="email"
                {...registerForm.register("email")}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="seu@email.com"
              />
              {registerForm.formState.errors.email && (
                <p className="mt-1 text-xs text-red-600">{registerForm.formState.errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
              <input
                type="password"
                {...registerForm.register("password")}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
              />
              {registerForm.formState.errors.password && (
                <p className="mt-1 text-xs text-red-600">{registerForm.formState.errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={registerForm.formState.isSubmitting}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 rounded-lg text-sm disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {registerForm.formState.isSubmitting ? "Criando conta..." : "Criar conta"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
