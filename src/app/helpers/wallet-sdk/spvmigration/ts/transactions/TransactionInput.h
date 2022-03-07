// Copyright (c) 2012-2018 The Elastos Open Source Project
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef __ELASTOS_SDK_TRANSACTIONINPUT_H__
#define __ELASTOS_SDK_TRANSACTIONINPUT_H__

#include <Common/ByteStream.h>
#include <Common/JsonSerializer.h>
#include <Common/BigInt.h>
#include <WalletCore/Address.h>
#include <Plugin/Interface/ELAMessageSerializable.h>

#include <nlohmann/json.hpp>

#include <string>

namespace Elastos {
	namespace ElaWallet {

		class TransactionInput :{
		public:
			TransactionInput();

			TransactionInput(const TransactionInput &input);

			TransactionInput &operator=(const TransactionInput &tx);

			TransactionInput(const uint256 &txHash, uint16_t index);

			~TransactionInput();

			const uint256 &TxHash() const;

			void SetTxHash(const uint256 &hash);

			uint16_t Index() const;

			void SetIndex(uint16_t index);

			uint32_t Sequence() const;

			void SetSequence(uint32_t sequence);

			size_t EstimateSize() const;

			void Serialize(ByteStream &stream) const;

			bool Deserialize(const ByteStream &stream);

			nlohmann::json ToJson() const;

			void FromJson(const nlohmann::json &j);

			size_t GetSize() const;

			bool operator==(const TransactionInput &in) const;

			bool operator!=(const TransactionInput &in) const;
		private:
		
		};

	}
}

#endif //__ELASTOS_SDK_TRANSACTIONINPUT_H__
