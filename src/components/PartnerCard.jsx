
import { Link } from "react-router-dom";

function PartnerCard({ partner }) {
    return (
        <article className="partner-card">
            <div className="partner-image-wrap">
                <img
                    src={partner.image}
                    alt={partner.name}
                    className="partner-image"
                    loading="lazy"
                />
                <span className="partner-type">{partner.type}</span>
            </div>

            <div className="partner-info">
                <span className="partner-location">
                    <span aria-hidden="true">⌖</span> {partner.location}
                </span>

                <h3>{partner.name}</h3>
                <p>{partner.description}</p>

                <Link to="/produtos" className="partner-link">
                    Explorar produtos <span aria-hidden="true">↗</span>
                </Link>
            </div>
        </article>
    );
}

export default PartnerCard;
