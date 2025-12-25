import { describe, expect, it } from "vitest";
import { Cl } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;

describe("Payment Processor Tests", () => {
  it("should process payment successfully", () => {
    const { result } = simnet.callPublicFn(
      "payment-processor",
      "send-payment",
      [Cl.principal(wallet2), Cl.uint(1000000), Cl.stringUtf8("test payment")],
      wallet1
    );
    expect(result).toBeOk(Cl.uint(1));
  });

  it("should reject zero amount", () => {
    const { result } = simnet.callPublicFn(
      "payment-processor",
      "send-payment",
      [Cl.principal(wallet2), Cl.uint(0), Cl.stringUtf8("zero payment")],
      wallet1
    );
    expect(result).toBeErr(Cl.uint(200));
  });

  it("should prevent self-payment", () => {
    const { result } = simnet.callPublicFn(
      "payment-processor",
      "send-payment",
      [Cl.principal(wallet1), Cl.uint(1000000), Cl.stringUtf8("self payment")],
      wallet1
    );
    expect(result).toBeErr(Cl.uint(201));
  });

  it("should calculate fees correctly", () => {
    simnet.callPublicFn(
      "payment-processor",
      "send-payment",
      [Cl.principal(wallet2), Cl.uint(1000000), Cl.stringUtf8("test")],
      wallet1
    );

    const { result } = simnet.callReadOnlyFn(
      "payment-processor",
      "get-total-fees",
      [],
      wallet1
    );
    expect(result).toBeOk(Cl.uint(20000)); // 2% of 1000000
  });

  it("should increment payment counter", () => {
    simnet.callPublicFn(
      "payment-processor",
      "send-payment",
      [Cl.principal(wallet2), Cl.uint(1000000), Cl.stringUtf8("payment 1")],
      wallet1
    );
    
    const { result } = simnet.callPublicFn(
      "payment-processor",
      "send-payment",
      [Cl.principal(wallet2), Cl.uint(2000000), Cl.stringUtf8("payment 2")],
      wallet1
    );
    expect(result).toBeOk(Cl.uint(2));
  });
});
