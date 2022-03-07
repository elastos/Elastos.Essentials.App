// Copyright (c) 2012-2018 The Elastos Open Source Project
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

namespace Elastos {
	namespace ElaWallet {
		class Program :  {
		public:
			Program();

			Program(const Program &program);

			Program(const bytes_t &code, const bytes_t &parameter);

			~Program();

			Program &operator=(const Program &tx);

			SignType DecodePublicKey(std::vector<bytes_t> &pubkeys) const;

			bool VerifySignature(const uint256 &md) const;

			nlohmann::json GetSignedInfo(const uint256 &md) const;

			const bytes_t &GetCode() const;

			const bytes_t &GetParameter() const;

			void SetCode(const bytes_t &code);

			void SetParameter(const bytes_t &parameter);

			size_t EstimateSize() const;

			void Serialize(ByteStream &stream) const;

			bool Deserialize(const ByteStream &stream);

			virtual nlohmann::json ToJson() const;

			virtual void FromJson(const nlohmann::json &j);

			bool operator==(const Program &p) const;

			bool operator!=(const Program &p) const;

		};
	}
}