// Copyright (c) 2012-2018 The Elastos Open Source Project
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef __ELASTOS_SDK_TRANSACTIONOUTPUT_H__
#define __ELASTOS_SDK_TRANSACTIONOUTPUT_H__

#include <Plugin/Interface/ELAMessageSerializable.h>
#include <Plugin/Transaction/Payload/OutputPayload/IOutputPayload.h>
#include <Plugin/Transaction/Asset.h>
#include <WalletCore/Address.h>
#include <Common/BigInt.h>

#include <boost/shared_ptr.hpp>

namespace Elastos {
	namespace ElaWallet {

		class TransactionOutput : public JsonSerializer {


		public:
			TransactionOutput();

			TransactionOutput(const TransactionOutput &output);

			TransactionOutput &operator=(const TransactionOutput &tx);

			size_t EstimateSize() const;

			void Serialize(ByteStream &stream, uint8_t txVersion) const;

			bool Deserialize(const ByteStream &stream, uint8_t txVersion);

			bool IsValid() const;

			const Address &GetAddress() const;

			const BigInt &Amount() const;

			void SetAmount(const BigInt &amount);

			const uint256 &AssetID() const;

			void SetAssetID(const uint256 &assetId);

			uint32_t OutputLock() const;

			void SetOutputLock(uint32_t outputLock);

			const Type &GetType() const;

			void SetType(const Type &type);

			const OutputPayloadPtr &GetPayload() const;

			OutputPayloadPtr &GetPayload();

			void SetPayload(const OutputPayloadPtr &payload);

			OutputPayloadPtr GeneratePayload(const Type &type);

			nlohmann::json ToJson() const;

			void FromJson(const nlohmann::json &j);

			bool operator==(const TransactionOutput &o) const;

			bool operator!=(const TransactionOutput &o) const;

		private:

		};


	}
}

#endif //__ELASTOS_SDK_TRANSACTIONOUTPUT_H__
