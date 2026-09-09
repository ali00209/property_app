"use client";

import {
  Banner,
  Button,
  Card,
  FormLayout,
  Heading,
  Stack,
  Text,
} from "@astryxdesign/core";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { TextField } from "@/components/ui";
import { loginAction, registerAction } from "./actions";
import { loginSchema, registerSchema } from "./validations";
import type { LoginFormValues, RegisterFormValues } from "./validations";

type FormValues = LoginFormValues | RegisterFormValues;

export function AuthForm({ isLogin }: { isLogin: boolean }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(isLogin ? loginSchema : registerSchema),
    defaultValues: isLogin
      ? { email: "admin@gmail.com", password: "password" }
      : { name: "", email: "", password: "" },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const result = isLogin
        ? await loginAction(values as LoginFormValues)
        : await registerAction(values as RegisterFormValues);

      if (!result.ok) {
        setErrorMessage(result.error.message);
        if (result.error.fieldErrors) {
          for (const [key, messages] of Object.entries(result.error.fieldErrors)) {
            if (messages[0]) {
              form.setError(key as never, {
                type: "server",
                message: messages[0],
              });
            }
          }
        }
        return;
      }

      const destination =
        result.data.role === "client" ? "/dashboard/properties" : "/dashboard";
      router.push(destination);
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  });

  return (
    <Card>
      <Heading level={2}>
        {isLogin ? "Welcome back" : "Create an account"}
      </Heading>
      <form onSubmit={onSubmit}>
        <FormLayout>
          {!isLogin ? (
            <TextField form={form} name="name" label="Full name" isRequired />
          ) : null}
          <TextField form={form} name="email" label="Email" type="email" isRequired />
          <TextField
            form={form}
            name="password"
            label="Password"
            type="password"
            isRequired
          />
          {errorMessage ? (
            <Banner status="error" title="Authentication failed" description={errorMessage} />
          ) : null}
          <Button
            width="100%"
            variant="primary"
            label={
              isSubmitting
                ? "Please wait…"
                : isLogin
                  ? "Sign In"
                  : "Create Account"
            }
            type="submit"
            isDisabled={isSubmitting}
          />
        </FormLayout>
      </form>
      <Stack align="center" gap={2}>
        <Button
          label={
            isLogin
              ? "Don't have an account? Sign up"
              : "Already have an account? Sign in"
          }
          variant="ghost"
          onClick={() => router.push(isLogin ? "/register" : "/login")}
        />
        <Text color="secondary">
          Use your authorized account to access property operations.
        </Text>
      </Stack>
    </Card>
  );
}