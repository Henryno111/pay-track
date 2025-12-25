import { describe, expect, it, beforeEach } from "vitest";
import { Cl } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;
const wallet3 = accounts.get("wallet_3")!;
const wallet4 = accounts.get("wallet_4")!;

describe("Payment Splitter Contract", () => {
  
  describe("Create Split", () => {
    it("should create a payment split configuration", () => {
      const totalAmount = 10000;
      const recipientCount = 3;
      const description = "Team project payment";
      
      const { result } = simnet.callPublicFn(
        "payment-splitter",
        "create-split",
        [Cl.uint(totalAmount), Cl.uint(recipientCount), Cl.stringAscii(description)],
        deployer
      );
      
      expect(result).toBeOk(Cl.uint(1));
    });
    
    it("should reject split with amount below minimum", () => {
      const { result } = simnet.callPublicFn(
        "payment-splitter",
        "create-split",
        [Cl.uint(500), Cl.uint(2), Cl.stringAscii("Too small")],
        deployer
      );
      
      expect(result).toBeErr(Cl.uint(605)); // ERR-INSUFFICIENT-AMOUNT
    });
    
    it("should reject split with too many recipients", () => {
      const { result } = simnet.callPublicFn(
        "payment-splitter",
        "create-split",
        [Cl.uint(100000), Cl.uint(25), Cl.stringAscii("Too many")],
        deployer
      );
      
      expect(result).toBeErr(Cl.uint(604)); // ERR-TOO-MANY-RECIPIENTS
    });
    
    it("should increment split counter correctly", () => {
      simnet.callPublicFn(
        "payment-splitter",
        "create-split",
        [Cl.uint(10000), Cl.uint(2), Cl.stringAscii("First split")],
        deployer
      );
      
      const { result } = simnet.callPublicFn(
        "payment-splitter",
        "create-split",
        [Cl.uint(20000), Cl.uint(3), Cl.stringAscii("Second split")],
        wallet1
      );
      
      expect(result).toBeOk(Cl.uint(2));
    });
  });
  
  describe("Add Recipients", () => {
    beforeEach(() => {
      simnet.callPublicFn(
        "payment-splitter",
        "create-split",
        [Cl.uint(10000), Cl.uint(3), Cl.stringAscii("Test split")],
        deployer
      );
    });
    
    it("should add recipient with valid percentage", () => {
      const { result } = simnet.callPublicFn(
        "payment-splitter",
        "add-recipient",
        [Cl.uint(1), Cl.uint(0), Cl.principal(wallet1), Cl.uint(5000)], // 50%
        deployer
      );
      
      expect(result).toBeOk(Cl.bool(true));
    });
    
    it("should calculate recipient amount correctly", () => {
      simnet.callPublicFn(
        "payment-splitter",
        "add-recipient",
        [Cl.uint(1), Cl.uint(0), Cl.principal(wallet1), Cl.uint(5000)], // 50%
        deployer
      );
      
      const { result } = simnet.callReadOnlyFn(
        "payment-splitter",
        "get-recipient",
        [Cl.uint(1), Cl.uint(0)],
        deployer
      );
      
      expect(result).toBeSome(
        Cl.tuple({
          recipient: Cl.principal(wallet1),
          percentage: Cl.uint(5000),
          amount: Cl.uint(5000), // 50% of 10000
          paid: Cl.bool(false)
        })
      );
    });
    
    it("should reject recipient addition by non-creator", () => {
      const { result } = simnet.callPublicFn(
        "payment-splitter",
        "add-recipient",
        [Cl.uint(1), Cl.uint(0), Cl.principal(wallet2), Cl.uint(3333)],
        wallet1 // Not the creator
      );
      
      expect(result).toBeErr(Cl.uint(600)); // ERR-NOT-AUTHORIZED
    });
    
    it("should reject invalid percentage (over 100%)", () => {
      const { result } = simnet.callPublicFn(
        "payment-splitter",
        "add-recipient",
        [Cl.uint(1), Cl.uint(0), Cl.principal(wallet1), Cl.uint(15000)], // 150%
        deployer
      );
      
      expect(result).toBeErr(Cl.uint(603)); // ERR-INVALID-PERCENTAGE
    });
    
    it("should allow adding multiple recipients", () => {
      simnet.callPublicFn(
        "payment-splitter",
        "add-recipient",
        [Cl.uint(1), Cl.uint(0), Cl.principal(wallet1), Cl.uint(5000)],
        deployer
      );
      
      simnet.callPublicFn(
        "payment-splitter",
        "add-recipient",
        [Cl.uint(1), Cl.uint(1), Cl.principal(wallet2), Cl.uint(3000)],
        deployer
      );
      
      const { result } = simnet.callPublicFn(
        "payment-splitter",
        "add-recipient",
        [Cl.uint(1), Cl.uint(2), Cl.principal(wallet3), Cl.uint(2000)],
        deployer
      );
      
      expect(result).toBeOk(Cl.bool(true));
    });
  });
  
  describe("Execute Split", () => {
    beforeEach(() => {
      // Create split with 3 recipients
      simnet.callPublicFn(
        "payment-splitter",
        "create-split",
        [Cl.uint(10000), Cl.uint(3), Cl.stringAscii("Execute test")],
        deployer
      );
      
      // Add 3 recipients totaling 100%
      simnet.callPublicFn(
        "payment-splitter",
        "add-recipient",
        [Cl.uint(1), Cl.uint(0), Cl.principal(wallet1), Cl.uint(5000)], // 50%
        deployer
      );
      
      simnet.callPublicFn(
        "payment-splitter",
        "add-recipient",
        [Cl.uint(1), Cl.uint(1), Cl.principal(wallet2), Cl.uint(3000)], // 30%
        deployer
      );
      
      simnet.callPublicFn(
        "payment-splitter",
        "add-recipient",
        [Cl.uint(1), Cl.uint(2), Cl.principal(wallet3), Cl.uint(2000)], // 20%
        deployer
      );
    });
    
    it("should execute split and mark as executed", () => {
      const { result } = simnet.callPublicFn(
        "payment-splitter",
        "execute-split",
        [Cl.uint(1)],
        deployer
      );
      
      expect(result).toBeOk(Cl.bool(true));
      
      // Verify split is marked as executed
      const splitData = simnet.callReadOnlyFn(
        "payment-splitter",
        "get-split",
        [Cl.uint(1)],
        deployer
      );
      
      expect(splitData.result).toBeSome(
        Cl.tuple({
          creator: Cl.principal(deployer),
          "total-amount": Cl.uint(10000),
          "recipient-count": Cl.uint(3),
          executed: Cl.bool(true),
          "created-at": Cl.uint(expect.any(Number)),
          "executed-at": Cl.some(Cl.uint(expect.any(Number))),
          description: Cl.stringAscii("Execute test")
        })
      );
    });
    
    it("should reject execution by non-creator", () => {
      const { result } = simnet.callPublicFn(
        "payment-splitter",
        "execute-split",
        [Cl.uint(1)],
        wallet1
      );
      
      expect(result).toBeErr(Cl.uint(600)); // ERR-NOT-AUTHORIZED
    });
    
    it("should reject double execution", () => {
      simnet.callPublicFn(
        "payment-splitter",
        "execute-split",
        [Cl.uint(1)],
        deployer
      );
      
      const { result } = simnet.callPublicFn(
        "payment-splitter",
        "execute-split",
        [Cl.uint(1)],
        deployer
      );
      
      expect(result).toBeErr(Cl.uint(606)); // ERR-ALREADY-EXECUTED
    });
    
    it("should update total volume after execution", () => {
      const volumeBefore = simnet.callReadOnlyFn(
        "payment-splitter",
        "get-total-volume",
        [],
        deployer
      );
      
      simnet.callPublicFn(
        "payment-splitter",
        "execute-split",
        [Cl.uint(1)],
        deployer
      );
      
      const volumeAfter = simnet.callReadOnlyFn(
        "payment-splitter",
        "get-total-volume",
        [],
        deployer
      );
      
      expect(volumeAfter.result).toBeUint(10000);
    });
  });
  
  describe("Quick Equal Split", () => {
    it("should create and execute equal split for 3 recipients", () => {
      const { result } = simnet.callPublicFn(
        "payment-splitter",
        "quick-equal-split",
        [
          Cl.uint(9000),
          Cl.list([Cl.principal(wallet1), Cl.principal(wallet2), Cl.principal(wallet3)])
        ],
        deployer
      );
      
      expect(result).toBeOk(Cl.bool(true));
    });
    
    it("should create and execute equal split for 2 recipients", () => {
      const { result } = simnet.callPublicFn(
        "payment-splitter",
        "quick-equal-split",
        [
          Cl.uint(10000),
          Cl.list([Cl.principal(wallet1), Cl.principal(wallet2)])
        ],
        deployer
      );
      
      expect(result).toBeOk(Cl.bool(true));
    });
    
    it("should reject quick split with insufficient amount", () => {
      const { result } = simnet.callPublicFn(
        "payment-splitter",
        "quick-equal-split",
        [
          Cl.uint(500),
          Cl.list([Cl.principal(wallet1), Cl.principal(wallet2)])
        ],
        deployer
      );
      
      expect(result).toBeErr(Cl.uint(605)); // ERR-INSUFFICIENT-AMOUNT
    });
  });
  
  describe("Read-Only Functions", () => {
    it("should get total splits count", () => {
      simnet.callPublicFn(
        "payment-splitter",
        "create-split",
        [Cl.uint(10000), Cl.uint(2), Cl.stringAscii("Test 1")],
        deployer
      );
      
      simnet.callPublicFn(
        "payment-splitter",
        "create-split",
        [Cl.uint(20000), Cl.uint(3), Cl.stringAscii("Test 2")],
        wallet1
      );
      
      const { result } = simnet.callReadOnlyFn(
        "payment-splitter",
        "get-total-splits",
        [],
        deployer
      );
      
      expect(result).toBeUint(2);
    });
    
    it("should track user split count", () => {
      simnet.callPublicFn(
        "payment-splitter",
        "create-split",
        [Cl.uint(10000), Cl.uint(2), Cl.stringAscii("Test 1")],
        deployer
      );
      
      simnet.callPublicFn(
        "payment-splitter",
        "create-split",
        [Cl.uint(15000), Cl.uint(2), Cl.stringAscii("Test 2")],
        deployer
      );
      
      const { result } = simnet.callReadOnlyFn(
        "payment-splitter",
        "get-user-split-count",
        [Cl.principal(deployer)],
        deployer
      );
      
      expect(result).toBeTuple({
        count: Cl.uint(2)
      });
    });
  });
});
