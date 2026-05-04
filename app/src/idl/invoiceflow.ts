/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/invoiceflow.json`.
 */
export type Invoiceflow = {
  "address": "DYkNRoH7goicxXzttxEALr6eRGp5EMkRxxpHQGYt3pAQ",
  "metadata": {
    "name": "invoiceflow",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Solana-native invoice + escrow protocol with milestone-based USDC release"
  },
  "instructions": [
    {
      "name": "approveMilestone",
      "docs": [
        "Client approves a single milestone. The milestone amount is split:",
        "(1 - fee) -> freelancer ATA, fee -> treasury ATA.",
        "Marks milestone approved+released, advances status to Completed when all done."
      ],
      "discriminator": [
        145,
        85,
        92,
        60,
        50,
        130,
        219,
        106
      ],
      "accounts": [
        {
          "name": "client",
          "docs": [
            "The client who funded the invoice."
          ],
          "signer": true
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "invoice",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  105,
                  110,
                  118,
                  111,
                  105,
                  99,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "invoice.freelancer",
                "account": "invoice"
              },
              {
                "kind": "account",
                "path": "invoice.invoice_id",
                "account": "invoice"
              }
            ]
          }
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "invoice"
              }
            ]
          }
        },
        {
          "name": "freelancerTokenAccount",
          "docs": [
            "Freelancer's USDC ATA — destination of the net amount."
          ],
          "writable": true
        },
        {
          "name": "treasuryTokenAccount",
          "docs": [
            "Protocol treasury USDC ATA — destination of the fee."
          ],
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": [
        {
          "name": "milestoneIdx",
          "type": "u8"
        }
      ]
    },
    {
      "name": "autoReleaseAfterTimeout",
      "docs": [
        "Permissionless: after `dispute_window_seconds` since funding (or last",
        "release), anyone can release the next un-released milestone. This protects",
        "freelancers from non-responsive clients. Disabled while Disputed."
      ],
      "discriminator": [
        148,
        214,
        2,
        233,
        139,
        234,
        141,
        99
      ],
      "accounts": [
        {
          "name": "caller",
          "docs": [
            "Anyone — typically the freelancer themselves, or a keeper bot."
          ],
          "signer": true
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "invoice",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  105,
                  110,
                  118,
                  111,
                  105,
                  99,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "invoice.freelancer",
                "account": "invoice"
              },
              {
                "kind": "account",
                "path": "invoice.invoice_id",
                "account": "invoice"
              }
            ]
          }
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "invoice"
              }
            ]
          }
        },
        {
          "name": "freelancerTokenAccount",
          "writable": true
        },
        {
          "name": "treasuryTokenAccount",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": [
        {
          "name": "milestoneIdx",
          "type": "u8"
        }
      ]
    },
    {
      "name": "cancelInvoice",
      "docs": [
        "Freelancer cancels an unfunded invoice (Open only). Closes the vault",
        "and refunds rent to the freelancer."
      ],
      "discriminator": [
        88,
        158,
        54,
        49,
        53,
        26,
        92,
        68
      ],
      "accounts": [
        {
          "name": "freelancer",
          "docs": [
            "Freelancer recovers the rent from both the invoice account and the",
            "vault token account."
          ],
          "writable": true,
          "signer": true,
          "relations": [
            "invoice"
          ]
        },
        {
          "name": "invoice",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  105,
                  110,
                  118,
                  111,
                  105,
                  99,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "invoice.freelancer",
                "account": "invoice"
              },
              {
                "kind": "account",
                "path": "invoice.invoice_id",
                "account": "invoice"
              }
            ]
          }
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "invoice"
              }
            ]
          }
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": []
    },
    {
      "name": "createInvoice",
      "docs": [
        "Freelancer creates a new invoice. Allocates the Invoice PDA and the",
        "vault token account (owned by the Invoice PDA). Status starts Open."
      ],
      "discriminator": [
        154,
        170,
        31,
        135,
        134,
        100,
        156,
        146
      ],
      "accounts": [
        {
          "name": "freelancer",
          "writable": true,
          "signer": true
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "acceptedMint",
          "docs": [
            "USDC mint, must match config."
          ]
        },
        {
          "name": "invoice",
          "docs": [
            "The Invoice PDA. Allocated for the user-supplied milestone count",
            "rather than `MAX_MILESTONES` to keep account rent minimal. Boxed so",
            "the deserialized Invoice (~290 bytes worst-case) lives on the heap",
            "— keeps `try_accounts`'s stack frame under Solana's 4KiB limit."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  105,
                  110,
                  118,
                  111,
                  105,
                  99,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "freelancer"
              },
              {
                "kind": "arg",
                "path": "invoiceId"
              }
            ]
          }
        },
        {
          "name": "vault",
          "docs": [
            "Vault token account (USDC) — PDA owned by the program, with authority",
            "set to the Invoice PDA so future releases sign via invoice seeds."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "invoice"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "invoiceId",
          "type": "u64"
        },
        {
          "name": "milestones",
          "type": {
            "vec": {
              "defined": {
                "name": "milestone"
              }
            }
          }
        },
        {
          "name": "disputeWindowSeconds",
          "type": "i64"
        },
        {
          "name": "expectedClient",
          "type": {
            "option": "pubkey"
          }
        }
      ]
    },
    {
      "name": "fundInvoice",
      "docs": [
        "Client funds the invoice — transfers `total_amount` USDC into the vault.",
        "Locks `client` on the Invoice and transitions Open -> Funded."
      ],
      "discriminator": [
        216,
        254,
        189,
        107,
        87,
        170,
        154,
        240
      ],
      "accounts": [
        {
          "name": "client",
          "writable": true,
          "signer": true
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "acceptedMint"
        },
        {
          "name": "invoice",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  105,
                  110,
                  118,
                  111,
                  105,
                  99,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "invoice.freelancer",
                "account": "invoice"
              },
              {
                "kind": "account",
                "path": "invoice.invoice_id",
                "account": "invoice"
              }
            ]
          }
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "invoice"
              }
            ]
          }
        },
        {
          "name": "clientTokenAccount",
          "docs": [
            "Client's USDC source. Must be a USDC ATA owned by the signer."
          ],
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": []
    },
    {
      "name": "initializeConfig",
      "docs": [
        "One-time initializer for protocol-wide config (treasury, fee, accepted mint).",
        "Called by deployer post-deploy. The PDA seed is fixed so re-running it fails."
      ],
      "discriminator": [
        208,
        127,
        21,
        1,
        194,
        190,
        196,
        70
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "acceptedMint",
          "docs": [
            "USDC mint to accept. Verified to be a real Mint account."
          ]
        },
        {
          "name": "treasury",
          "docs": [
            "SOL wallet that controls the treasury (informational on-chain)."
          ]
        },
        {
          "name": "treasuryTokenAccount",
          "docs": [
            "USDC token account that will receive protocol fees. Must match the",
            "accepted mint and be owned by `treasury`."
          ]
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "feeBasisPoints",
          "type": "u16"
        }
      ]
    },
    {
      "name": "raiseDispute",
      "docs": [
        "Client pauses auto-release by raising a dispute."
      ],
      "discriminator": [
        41,
        243,
        1,
        51,
        150,
        95,
        246,
        73
      ],
      "accounts": [
        {
          "name": "client",
          "signer": true
        },
        {
          "name": "invoice",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  105,
                  110,
                  118,
                  111,
                  105,
                  99,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "invoice.freelancer",
                "account": "invoice"
              },
              {
                "kind": "account",
                "path": "invoice.invoice_id",
                "account": "invoice"
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "requestRaenestPayout",
      "docs": [
        "v2 ROADMAP STUB: signed intent for off-chain USDC → NGN conversion via",
        "Raenest. Emits `RaenestPayoutRequested` only — no on-chain token",
        "movement. An off-chain indexer is expected to consume the event and",
        "drive the Raenest API. See `instructions/request_raenest_payout.rs`."
      ],
      "discriminator": [
        32,
        101,
        240,
        84,
        225,
        85,
        158,
        220
      ],
      "accounts": [
        {
          "name": "freelancer",
          "signer": true
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "sourceInvoice",
          "type": {
            "option": "pubkey"
          }
        },
        {
          "name": "raenestAccountId",
          "type": "string"
        },
        {
          "name": "memo",
          "type": "string"
        }
      ]
    },
    {
      "name": "resolveDispute",
      "docs": [
        "Client clears their own dispute, resuming the milestone flow."
      ],
      "discriminator": [
        231,
        6,
        202,
        6,
        96,
        103,
        12,
        230
      ],
      "accounts": [
        {
          "name": "client",
          "signer": true
        },
        {
          "name": "invoice",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  105,
                  110,
                  118,
                  111,
                  105,
                  99,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "invoice.freelancer",
                "account": "invoice"
              },
              {
                "kind": "account",
                "path": "invoice.invoice_id",
                "account": "invoice"
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "updateConfig",
      "docs": [
        "Update mutable config fields. Authority-gated."
      ],
      "discriminator": [
        29,
        158,
        252,
        191,
        10,
        83,
        219,
        99
      ],
      "accounts": [
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "authority",
          "signer": true,
          "relations": [
            "config"
          ]
        }
      ],
      "args": [
        {
          "name": "newFeeBasisPoints",
          "type": {
            "option": "u16"
          }
        },
        {
          "name": "newTreasury",
          "type": {
            "option": "pubkey"
          }
        },
        {
          "name": "newTreasuryTokenAccount",
          "type": {
            "option": "pubkey"
          }
        },
        {
          "name": "newAuthority",
          "type": {
            "option": "pubkey"
          }
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "config",
      "discriminator": [
        155,
        12,
        170,
        224,
        30,
        250,
        204,
        130
      ]
    },
    {
      "name": "invoice",
      "discriminator": [
        51,
        194,
        250,
        114,
        6,
        104,
        18,
        164
      ]
    }
  ],
  "events": [
    {
      "name": "disputeRaised",
      "discriminator": [
        246,
        167,
        109,
        37,
        142,
        45,
        38,
        176
      ]
    },
    {
      "name": "disputeResolved",
      "discriminator": [
        121,
        64,
        249,
        153,
        139,
        128,
        236,
        187
      ]
    },
    {
      "name": "invoiceCancelled",
      "discriminator": [
        62,
        68,
        182,
        115,
        197,
        226,
        135,
        244
      ]
    },
    {
      "name": "invoiceCompleted",
      "discriminator": [
        73,
        171,
        160,
        145,
        74,
        45,
        220,
        0
      ]
    },
    {
      "name": "invoiceCreated",
      "discriminator": [
        189,
        114,
        235,
        219,
        193,
        125,
        47,
        54
      ]
    },
    {
      "name": "invoiceFunded",
      "discriminator": [
        33,
        90,
        129,
        131,
        31,
        43,
        33,
        33
      ]
    },
    {
      "name": "milestoneReleased",
      "discriminator": [
        49,
        225,
        91,
        223,
        34,
        165,
        109,
        181
      ]
    },
    {
      "name": "raenestPayoutRequested",
      "discriminator": [
        124,
        169,
        69,
        237,
        16,
        119,
        173,
        170
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "invalidMilestoneCount",
      "msg": "Milestone count must be between 1 and MAX_MILESTONES"
    },
    {
      "code": 6001,
      "name": "milestoneAmountMismatch",
      "msg": "Sum of milestone amounts must equal total invoice amount"
    },
    {
      "code": 6002,
      "name": "zeroMilestoneAmount",
      "msg": "Milestone amount must be greater than zero"
    },
    {
      "code": 6003,
      "name": "invalidDisputeWindow",
      "msg": "Dispute window outside allowed bounds"
    },
    {
      "code": 6004,
      "name": "invalidFeeBasisPoints",
      "msg": "Fee basis points exceed maximum allowed"
    },
    {
      "code": 6005,
      "name": "invalidInvoiceStatus",
      "msg": "Invoice is not in the required state for this action"
    },
    {
      "code": 6006,
      "name": "unauthorized",
      "msg": "Caller is not authorized for this invoice"
    },
    {
      "code": 6007,
      "name": "unexpectedClient",
      "msg": "Invoice was created with an expected client; funder pubkey does not match"
    },
    {
      "code": 6008,
      "name": "invalidMint",
      "msg": "Token mint does not match the protocol's accepted mint"
    },
    {
      "code": 6009,
      "name": "invalidTokenAccountOwner",
      "msg": "Token account owner mismatch"
    },
    {
      "code": 6010,
      "name": "milestoneOutOfRange",
      "msg": "Milestone index out of range"
    },
    {
      "code": 6011,
      "name": "milestoneAlreadyReleased",
      "msg": "Milestone has already been released"
    },
    {
      "code": 6012,
      "name": "timeoutNotElapsed",
      "msg": "Auto-release timeout has not yet elapsed"
    },
    {
      "code": 6013,
      "name": "disputeActive",
      "msg": "Auto-release blocked because invoice is currently disputed"
    },
    {
      "code": 6014,
      "name": "cannotDispute",
      "msg": "Cannot raise dispute on an invoice in this state"
    },
    {
      "code": 6015,
      "name": "invalidTreasuryAccount",
      "msg": "Treasury token account does not match config"
    },
    {
      "code": 6016,
      "name": "numericOverflow",
      "msg": "Numeric overflow"
    },
    {
      "code": 6017,
      "name": "cannotCancel",
      "msg": "Cannot cancel a funded or completed invoice"
    },
    {
      "code": 6018,
      "name": "invalidPayoutAmount",
      "msg": "Payout amount must be greater than zero"
    },
    {
      "code": 6019,
      "name": "invalidRaenestAccountId",
      "msg": "Raenest account id must be 1..=64 UTF-8 chars"
    },
    {
      "code": 6020,
      "name": "memoTooLong",
      "msg": "Memo exceeds 200 characters"
    }
  ],
  "types": [
    {
      "name": "config",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "docs": [
              "Authority allowed to update mutable config fields."
            ],
            "type": "pubkey"
          },
          {
            "name": "treasury",
            "docs": [
              "Wallet receiving protocol fees (informational; transfers go to ATA below)."
            ],
            "type": "pubkey"
          },
          {
            "name": "treasuryTokenAccount",
            "docs": [
              "USDC token account owned by `treasury` — the actual fee sink."
            ],
            "type": "pubkey"
          },
          {
            "name": "acceptedMint",
            "docs": [
              "Mint accepted as payment (USDC on the active cluster)."
            ],
            "type": "pubkey"
          },
          {
            "name": "feeBasisPoints",
            "docs": [
              "Protocol fee taken from each release, in basis points (50 = 0.5%)."
            ],
            "type": "u16"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "disputeRaised",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "invoice",
            "type": "pubkey"
          },
          {
            "name": "raisedBy",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "disputeResolved",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "invoice",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "invoice",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "freelancer",
            "docs": [
              "Payee — the wallet that receives released funds."
            ],
            "type": "pubkey"
          },
          {
            "name": "client",
            "docs": [
              "Payer — `Pubkey::default()` until first funding."
            ],
            "type": "pubkey"
          },
          {
            "name": "expectedClient",
            "docs": [
              "Optional pre-set client. If `Some`, only this pubkey may fund."
            ],
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "invoiceId",
            "docs": [
              "Stable per-freelancer counter. Combined with `freelancer` to derive PDA."
            ],
            "type": "u64"
          },
          {
            "name": "totalAmount",
            "docs": [
              "Sum of milestone.amount. Set at creation, never mutated."
            ],
            "type": "u64"
          },
          {
            "name": "releasedAmount",
            "docs": [
              "Sum of milestone.amount for milestones with released = true."
            ],
            "type": "u64"
          },
          {
            "name": "status",
            "type": {
              "defined": {
                "name": "invoiceStatus"
              }
            }
          },
          {
            "name": "createdAt",
            "type": "i64"
          },
          {
            "name": "fundedAt",
            "docs": [
              "Unix ts of fund_invoice. Used as base for the auto-release timer."
            ],
            "type": "i64"
          },
          {
            "name": "lastReleaseAt",
            "docs": [
              "Unix ts of last successful release. Resets the auto-release timer",
              "per-milestone (each completed step buys the client more time on the next)."
            ],
            "type": "i64"
          },
          {
            "name": "disputeWindowSeconds",
            "docs": [
              "Seconds after `funded_at` / `last_release_at` before the next milestone",
              "can be auto-released by anyone."
            ],
            "type": "i64"
          },
          {
            "name": "milestoneCount",
            "docs": [
              "Number of valid entries in `milestones`. `<= MAX_MILESTONES`."
            ],
            "type": "u8"
          },
          {
            "name": "milestones",
            "type": {
              "vec": {
                "defined": {
                  "name": "milestone"
                }
              }
            }
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "invoiceCancelled",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "invoice",
            "type": "pubkey"
          },
          {
            "name": "freelancer",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "invoiceCompleted",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "invoice",
            "type": "pubkey"
          },
          {
            "name": "totalReleased",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "invoiceCreated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "invoice",
            "type": "pubkey"
          },
          {
            "name": "freelancer",
            "type": "pubkey"
          },
          {
            "name": "invoiceId",
            "type": "u64"
          },
          {
            "name": "totalAmount",
            "type": "u64"
          },
          {
            "name": "milestoneCount",
            "type": "u8"
          },
          {
            "name": "expectedClient",
            "type": {
              "option": "pubkey"
            }
          }
        ]
      }
    },
    {
      "name": "invoiceFunded",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "invoice",
            "type": "pubkey"
          },
          {
            "name": "client",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "fundedAt",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "invoiceStatus",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "open"
          },
          {
            "name": "funded"
          },
          {
            "name": "disputed"
          },
          {
            "name": "completed"
          },
          {
            "name": "cancelled"
          }
        ]
      }
    },
    {
      "name": "milestone",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "descriptionHash",
            "docs": [
              "keccak256 / sha256 of the off-chain milestone description. Lets the UI",
              "prove what was approved without putting human-readable text on-chain."
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "amount",
            "docs": [
              "USDC amount (in base units — 6 decimals) for this milestone."
            ],
            "type": "u64"
          },
          {
            "name": "approved",
            "docs": [
              "Set true when client (or auto-release) approves this milestone."
            ],
            "type": "bool"
          },
          {
            "name": "released",
            "docs": [
              "Set true once funds have actually been transferred out."
            ],
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "milestoneReleased",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "invoice",
            "type": "pubkey"
          },
          {
            "name": "milestoneIdx",
            "type": "u8"
          },
          {
            "name": "amountToFreelancer",
            "type": "u64"
          },
          {
            "name": "feeToTreasury",
            "type": "u64"
          },
          {
            "name": "releasedBy",
            "type": "pubkey"
          },
          {
            "name": "autoReleased",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "raenestPayoutRequested",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "freelancer",
            "type": "pubkey"
          },
          {
            "name": "sourceInvoice",
            "docs": [
              "Optional reference to the invoice the funds came from. Useful for",
              "indexers to pair a payout with the source escrow."
            ],
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "raenestAccountId",
            "docs": [
              "Raenest virtual-account identifier (UTF-8). The off-chain bridge maps",
              "this to a real NGN bank account on Raenest's side."
            ],
            "type": "string"
          },
          {
            "name": "memo",
            "docs": [
              "Free-form note shown on the freelancer's transaction history."
            ],
            "type": "string"
          },
          {
            "name": "requestedAt",
            "type": "i64"
          }
        ]
      }
    }
  ],
  "constants": [
    {
      "name": "programVersion",
      "type": "string",
      "value": "\"0.1.0\""
    }
  ]
};
