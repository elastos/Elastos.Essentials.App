// Copyright (c) 2012-2018 The Elastos Open Source Project
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef __ELASTOS_SDK_TRANSACTION_H__
#define __ELASTOS_SDK_TRANSACTION_H__

#include <Common/JsonSerializer.h>
#include <Plugin/Interface/ELAMessageSerializable.h>
#include <Plugin/Transaction/Payload/IPayload.h>

#include <boost/shared_ptr.hpp>

namespace Elastos {
	namespace ElaWallet {

		class Transaction : public ELAMessageSerializable, public JsonSerializer {

		public:
			Transaction();

			Transaction(uint8_t type, PayloadPtr payload);

			Transaction(const Transaction &tx);

			Transaction &operator=(const Transaction &tx);

			bool operator==(const Transaction &tx) const;

			virtual ~Transaction();

			void Serialize(ByteStream &stream) const;

			bool Deserialize(const ByteStream &stream);

			virtual bool DeserializeType(const ByteStream &istream);

			uint64_t CalculateFee(uint64_t feePerKb);

			bool IsRegistered() const;

			bool &IsRegistered();

			const uint256 &GetHash() const;

			void SetHash(const uint256 &hash);

			void ResetHash();

			uint8_t GetVersion() const;

			void SetVersion(uint8_t version);

			const std::vector<OutputPtr> &GetOutputs() const;

			void RemoveOutput(const OutputPtr &output);

			const std::vector<InputPtr> &GetInputs() const;

			std::vector<InputPtr> &GetInputs();

			void AddInput(const InputPtr &Input);

			bool ContainInput(const uint256 &hash, uint32_t n) const;

			uint8_t GetTransactionType() const;

			void SetTransactionType(uint8_t type);

			static std::vector<uint8_t> GetDPoSTxTypes();

			static std::vector<uint8_t> GetCRCTxTypes();

			static std::vector<uint8_t> GetProposalTypes();

			uint32_t GetLockTime() const;

			void SetLockTime(uint32_t lockTime);

			uint32_t GetBlockHeight() const;

			void SetBlockHeight(uint32_t height);

			time_t GetTimestamp() const;

			void SetTimestamp(time_t timestamp);

			size_t EstimateSize() const;

			nlohmann::json GetSignedInfo() const;

			bool IsSigned() const;

			bool IsCoinBase() const;

			bool IsUnconfirmed() const;

			bool IsValid() const;

			virtual nlohmann::json ToJson() const;

			virtual void FromJson(const nlohmann::json &j);

			const IPayload *GetPayload() const;

			IPayload *GetPayload();

			const PayloadPtr &GetPayloadPtr() const;

			void SetPayload(const PayloadPtr &payload);

			void AddAttribute(const AttributePtr &attribute);

			bool AddUniqueProgram(const ProgramPtr &program);

			void AddProgram(const ProgramPtr &program);

			void ClearPrograms();

			const std::vector<AttributePtr> &GetAttributes() const;

			const std::vector<ProgramPtr> &GetPrograms() const;

			uint8_t	GetPayloadVersion() const;

			void SetPayloadVersion(uint8_t version);

			uint64_t GetFee() const;

			void SetFee(uint64_t fee);

			void SerializeUnsigned(ByteStream &ostream) const;

			uint256 GetShaData() const;

			void Cleanup();

			bool IsEqual(const Transaction &tx) const;

			uint32_t GetConfirms(uint32_t walletBlockHeight) const;

			std::string GetConfirmStatus(uint32_t walletBlockHeight) const;

		public:
			virtual PayloadPtr InitPayload(uint8_t type);

		};

	}
}

namespace nlohmann {
	template<>
	struct adl_serializer<Elastos::ElaWallet::Transaction> {
		static void to_json(json &j, const Elastos::ElaWallet::Transaction &tx) {
			j = tx.ToJson();
		}

		static void from_json(const json &j, Elastos::ElaWallet::Transaction &tx) {
			tx.FromJson(j);
		}
	};
}

#endif //__ELASTOS_SDK_TRANSACTION_H__
